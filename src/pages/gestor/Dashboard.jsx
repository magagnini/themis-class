import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BookOpen, Users, AlertTriangle, AlertCircle, Loader2, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState({ ocorrencias_hoje: 0, alunos_envolvidos: 0, total_ocorrencias: 0, graves: 0 });
  const [atividades, setAtividades] = useState([]);
  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [userName, setUserName] = useState('Gestor');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setCarregando(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) { setCarregando(false); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, name')
      .eq('id', userData.user.id)
      .single();

    if (!profile?.school_id) { setCarregando(false); return; }

    const schoolId = profile.school_id;
    setUserName(profile.name || 'Gestor');

    const hoje = new Date();
    const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();
    const fimDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1).toISOString();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();

    // Buscar todos os incidents da escola deste mês
    const { data: incidents } = await supabase
      .from('incidents')
      .select('id, student_id, severity, created_at, incident_date, students(name), incident_types_list, description')
      .eq('school_id', schoolId)
      .gte('created_at', inicioMes)
      .order('created_at', { ascending: false });

    const todasOcorrencias = incidents || [];

    // Ocorrências hoje
    const ocHoje = todasOcorrencias.filter(i => {
      const d = i.incident_date || i.created_at;
      return d >= inicioDia && d < fimDia;
    }).length;

    // Alunos únicos envolvidos no mês
    const alunosUnicos = new Set(todasOcorrencias.map(i => i.student_id)).size;

    // Graves no mês
    const graves = todasOcorrencias.filter(i => i.severity === 'high').length;

    setStats({
      ocorrencias_hoje: ocHoje,
      alunos_envolvidos: alunosUnicos,
      total_ocorrencias: todasOcorrencias.length,
      graves,
    });

    // Atividade recente (últimas 5 ocorrências)
    const recentes = todasOcorrencias.slice(0, 5).map(i => {
      const tipos = (i.incident_types_list || []).map(t => t.label).join(', ');
      const nomeAluno = i.students?.name || 'Aluno';
      return {
        id: i.id,
        descricao: `${nomeAluno} — ${tipos || i.description || 'Ocorrência registrada'}`,
        created_at: i.created_at,
      };
    });
    setAtividades(recentes);

    // Gráfico — últimos 6 meses
    const meses = [];
    for (let m = 5; m >= 0; m--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - m, 1);
      const inicioM = d.toISOString();
      const fimM = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
      const nome = d.toLocaleDateString('pt-BR', { month: 'short' });
      meses.push({ name: nome.charAt(0).toUpperCase() + nome.slice(1, 3), inicioM, fimM });
    }

    // Buscar todos os incidents dos últimos 6 meses
    const { data: incidentsGrafico } = await supabase
      .from('incidents')
      .select('created_at')
      .eq('school_id', schoolId)
      .gte('created_at', meses[0].inicioM);

    const dadosMeses = meses.map(({ name, inicioM, fimM }) => ({
      name,
      total: (incidentsGrafico || []).filter(i => i.created_at >= inicioM && i.created_at < fimM).length,
    }));

    setDadosGrafico(dadosMeses);
    setCarregando(false);
  };

  const cards = [
    { label: 'Ocorrências Hoje', valor: stats.ocorrencias_hoje, icone: <AlertTriangle />, cor: '#f59e0b' },
    { label: 'Alunos Envolvidos', valor: stats.alunos_envolvidos, icone: <Users />, cor: '#3b82f6' },
    { label: 'Ocorrências no Mês', valor: stats.total_ocorrencias, icone: <BookOpen />, cor: '#9ca3af' },
    { label: 'Graves (Mês)', valor: stats.graves, icone: <AlertCircle />, cor: '#ef4444' },
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

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '25px', minHeight: '400px' }}>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#374151' }}>Evolução de Ocorrências (Mês a Mês)</h3>
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
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(v) => [v, 'Ocorrências']}
                />
                <Area type="monotone" dataKey="total" stroke="#9b1c26" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#374151' }}>Atividade Recente</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {atividades.length > 0 ? atividades.map((at) => (
              <div key={at.id} style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px', alignItems: 'flex-start' }}>
                <div style={{ padding: '8px', backgroundColor: '#fdf2f2', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9b1c26', flexShrink: 0 }}>
                  <Clock size={14} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827', marginBottom: '2px', lineHeight: '1.4' }}>{at.descricao}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {new Date(at.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af' }}>
                <AlertTriangle size={32} style={{ marginBottom: '8px', opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: '13px' }}>Nenhuma ocorrência registrada ainda.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
