import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BookOpen, Users, AlertTriangle, AlertCircle, Loader2, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState({ ocorrencias_hoje: 0, alunos_envolvidos: 0, total_ocorrencias: 0, graves: 0 });
  const [atividades, setAtividades] = useState([]);
  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // Mocking the dashboard data for now, as we don't have the real tables populated yet
    const carregarDados = () => {
      setCarregando(true);
      
      // Mock stats
      setStats({
        ocorrencias_hoje: 12,
        alunos_envolvidos: 45,
        total_ocorrencias: 128,
        graves: 8
      });

      // Mock recent activities
      setAtividades([
        { id: 1, descricao: 'Nova ocorrência grave: João Silva', created_at: new Date().toISOString() },
        { id: 2, descricao: 'Ocorrência leve: Maria Souza (Atraso)', created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 3, descricao: 'Aluno cadastrado: Pedro Costa', created_at: new Date(Date.now() - 7200000).toISOString() },
        { id: 4, descricao: 'Ocorrência atualizada: Ana Lima', created_at: new Date(Date.now() - 86400000).toISOString() }
      ]);

      // Mock chart data (last 6 months)
      const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
      const ultimos6Meses = meses.map(m => ({ name: m, total: Math.floor(Math.random() * 50) + 10 }));
      setDadosGrafico(ultimos6Meses);

      setCarregando(false);
    };

    carregarDados();
  }, []);

  const cards = [
    { label: 'Ocorrências Hoje', valor: stats.ocorrencias_hoje, icone: <AlertTriangle />, cor: '#f59e0b' },
    { label: 'Alunos Envolvidos', valor: stats.alunos_envolvidos, icone: <Users />, cor: '#3b82f6' },
    { label: 'Ocorrências no Mês', valor: stats.total_ocorrencias, icone: <BookOpen />, cor: '#9ca3af' },
    { label: 'Graves (Mês)', valor: stats.graves, icone: <AlertCircle />, cor: '#ef4444' },
  ];

  if (carregando) {
    return (
      <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animar-giro" size={40} color="#9b1c26" />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .animar-giro { animation: spin 1s linear infinite; }
        `}</style>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: '28px', marginBottom: '10px', color: '#111827', margin: '0 0 8px 0' }}>Visão Geral</h2>
      <p style={{ color: '#6b7280', margin: '0 0 30px 0' }}>Bem-vindo ao Themis Class, Gestor.</p>

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
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
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
              <div key={at.id} style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px', alignItems: 'center' }}>
                <div style={{
                  padding: '10px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280'
                }}>
                  <Clock size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827', marginBottom: '2px' }}>{at.descricao}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                    {new Date(at.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )) : (
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Nenhuma atividade registrada.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
