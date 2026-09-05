import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getUserProfile } from '../../lib/userCache';
import { BookOpen, Users, AlertTriangle, Loader2, Clock, Trophy } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState({ ocorrencias_hoje: 0, alunos_envolvidos: 0, total_ocorrencias: 0, graves: 0 });
  const [atividades, setAtividades] = useState([]);
  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [topClasses, setTopClasses] = useState([]);
  const [topStudents, setTopStudents] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [userName, setUserName] = useState('Gestor');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setCarregando(true);

    // Usa cache — zero queries extras ao banco para saber quem é o usuário
    const profile = await getUserProfile();
    if (!profile?.school_id) { setCarregando(false); return; }

    const schoolId = profile.school_id;
    setUserName(profile.name || 'Gestor');

    const hoje = new Date();
    const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();
    const fimDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1).toISOString();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();

    // Calcular início dos 6 meses para o gráfico
    const inicioGrafico = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1).toISOString();

    // UMA única query buscando todos os dados necessários (mês atual + 6 meses para gráfico)
    // em PARALELO com nada mais para aguardar — sem await encadeados
    const { data: incidents } = await supabase
      .from('incidents')
      .select('id, student_id, severity, created_at, incident_date, class_name, students(name), incident_types_list, description')
      .eq('school_id', schoolId)
      .gte('created_at', inicioGrafico)
      .order('created_at', { ascending: false });

    const todasOcorrencias = incidents || [];

    // Separar ocorrências do mês atual vs. históricas (para o gráfico)
    const ocorrenciasMes = todasOcorrencias.filter(i => i.created_at >= inicioMes);

    const ocHoje = ocorrenciasMes.filter(i => {
      const d = i.incident_date || i.created_at;
      return d >= inicioDia && d < fimDia;
    }).length;

    const alunosUnicos = new Set(ocorrenciasMes.map(i => i.student_id)).size;
    const graves = ocorrenciasMes.filter(i => i.severity === 'high').length;

    setStats({
      ocorrencias_hoje: ocHoje,
      alunos_envolvidos: alunosUnicos,
      total_ocorrencias: ocorrenciasMes.length,
      graves,
    });

    const recentes = ocorrenciasMes.slice(0, 5).map(i => {
      const tipos = (i.incident_types_list || []).map(t => t.label).join(', ');
      const nomeAluno = i.students?.name || 'Aluno';
      return {
        id: i.id,
        descricao: `${nomeAluno} — ${tipos || i.description || 'Ocorrência registrada'}`,
        created_at: i.created_at,
      };
    });
    setAtividades(recentes);

    // Top 10 Turmas (baseado no mês)
    const turmasCount = {};
    ocorrenciasMes.forEach(i => {
      const tName = i.class_name || 'Sem turma';
      turmasCount[tName] = (turmasCount[tName] || 0) + 1;
    });
    const turmasArray = Object.entries(turmasCount)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
    setTopClasses(turmasArray);

    // Top 5 Alunos (baseado no mês)
    const alunosCount = {};
    ocorrenciasMes.forEach(i => {
      const sId = i.student_id;
      if (!sId) return;
      if (!alunosCount[sId]) {
        alunosCount[sId] = { nome: i.students?.name || 'Desconhecido', total: 0 };
      }
      alunosCount[sId].total++;
    });
    const alunosArray = Object.values(alunosCount)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    setTopStudents(alunosArray);

    // Gráfico dos 6 meses — calculado dos dados já carregados (sem nova query!)
    const meses = [];
    for (let m = 5; m >= 0; m--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - m, 1);
      const inicioM = d.toISOString();
      const fimM = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
      const nome = d.toLocaleDateString('pt-BR', { month: 'short' });
      meses.push({ name: nome.charAt(0).toUpperCase() + nome.slice(1, 3), inicioM, fimM });
    }

    const dadosMeses = meses.map(({ name, inicioM, fimM }) => ({
      name,
      total: todasOcorrencias.filter(i => i.created_at >= inicioM && i.created_at < fimM).length,
    }));
    setDadosGrafico(dadosMeses);

    setCarregando(false);
  };

  const cards = [
    { label: 'Ocorrências Hoje', valor: stats.ocorrencias_hoje, icone: <AlertTriangle />, cor: '#f59e0b' },
    { label: 'Alunos Envolvidos', valor: stats.alunos_envolvidos, icone: <Users />, cor: '#3b82f6' },
    { label: 'Ocorrências no Mês', valor: stats.total_ocorrencias, icone: <BookOpen />, cor: '#9ca3af' },
  ];

  if (carregando) {
    return (
      <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={40} color="#9b1c26" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: '28px', marginBottom: '10px', color: '#111827', margin: '0 0 8px 0' }}>Visão Geral</h2>
      <p style={{ color: '#6b7280', margin: '0 0 30px 0' }}>Bem-vindo ao Themis Class, {userName}.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        {cards.map((card, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '20px', background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '15px', backgroundColor: `${card.cor}22`, color: card.cor, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {card.icone}
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500', marginBottom: '4px' }}>{card.label}</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{card.valor}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '25px', marginBottom: '25px' }}>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#374151' }}>Evolução de Ocorrências (Últimos 6 Meses)</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dadosGrafico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9b1c26" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#9b1c26" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#6b7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="total" name="Ocorrências" stroke="#9b1c26" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#374151' }}>Top 5 Alunos com Ocorrências (Mês)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {topStudents.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Nenhum dado neste mês.</p>
            ) : (
              topStudents.map((aluno, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: i === 0 ? '#fef08a' : i === 1 ? '#e5e7eb' : i === 2 ? '#fed7aa' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: i === 0 ? '#854d0e' : i === 1 ? '#374151' : i === 2 ? '#9a3412' : '#9ca3af' }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                    {aluno.nome}
                  </div>
                  <div style={{ fontWeight: '700', color: '#9b1c26' }}>
                    {aluno.total}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '25px' }}>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#374151' }}>Top 10 Turmas (Mês)</h3>
          <div style={{ width: '100%', height: '300px' }}>
            {topClasses.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Nenhum dado neste mês.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topClasses} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#6b7280' }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#374151', width: 100 }} width={120} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}
                    cursor={{fill: '#f3f4f6'}}
                  />
                  <Bar dataKey="total" name="Ocorrências" fill="#9b1c26" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#374151' }}>Atividade Recente</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {atividades.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Nenhuma atividade recente.</p>
            ) : (
              atividades.map((ativ) => (
                <div key={ativ.id} style={{ display: 'flex', gap: '15px' }}>
                  <div style={{ width: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#9b1c26', flexShrink: 0, marginTop: '5px' }} />
                    <div style={{ width: '2px', height: '100%', backgroundColor: '#f3f4f6', flexGrow: 1 }} />
                  </div>
                  <div style={{ paddingBottom: '10px' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#111827', fontWeight: '500', lineHeight: '1.4' }}>
                      {ativ.descricao}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#6b7280' }}>
                      <Clock size={12} />
                      {new Date(ativ.created_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
