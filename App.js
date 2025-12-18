
import { defineComponent, h } from 'vue';
import { state, useAccounting } from './state.js';
import Sidebar from './components/Sidebar.js';
import Dashboard from './components/Dashboard.js';
import ChartOfAccounts from './components/ChartOfAccounts.js';
import Journal from './components/Journal.js';
import Reports from './components/Reports.js';
import Billing from './components/Billing.js';
import Procurement from './components/Procurement.js';
import Payroll from './components/Payroll.js';
import Budgeting from './components/Budgeting.js';
import Assets from './components/Assets.js';
import AuditTrail from './components/AuditTrail.js';
import { getFinancialInsight } from './geminiService.js';

export default defineComponent({
  name: 'App',
  setup() {
    const { summary } = useAccounting();
    const runAnalysis = async () => {
      state.isAnalyzing = true;
      state.aiInsight = await getFinancialInsight(summary.value);
      state.isAnalyzing = false;
    };
    return { state, runAnalysis };
  },
  render() {
    return h('div', { class: 'flex h-screen' }, [
      h(Sidebar),
      h('main', { class: 'flex-1 overflow-y-auto scrollbar-hide bg-[#f8fafc]' }, [
        h('div', { class: 'p-12 max-w-[1600px] mx-auto' }, [
          h('header', { class: 'flex justify-between items-center mb-12 animate-fade' }, [
            h('div', [
              h('h1', { class: 'text-4xl font-black text-slate-900 tracking-tight capitalize' }, this.state.activeTab.replace('_', ' ')),
              h('p', { class: 'text-slate-400 font-semibold text-base mt-1' }, 'Institutional Financial Hub | SRPHS')
            ]),
            h('button', {
              onClick: this.runAnalysis,
              disabled: this.state.isAnalyzing,
              class: 'green-gradient text-white font-black px-8 py-4 rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center gap-3'
            }, [
              this.state.isAnalyzing ? 'Analyzing Data...' : '✨ AI Financial Advisor'
            ])
          ]),

          this.state.aiInsight ? h('div', { class: 'mb-12 premium-card p-10 relative animate-fade' }, [
             h('button', { onClick: () => this.state.aiInsight = '', class: 'absolute top-6 right-6 text-black hover:opacity-60 transition-opacity font-black' }, '✕'),
             h('h3', { class: 'text-emerald-600 font-black mb-4 flex items-center gap-2 uppercase tracking-[0.2em] text-xs' }, [
               '✨ Intelligence Advisory'
             ]),
             h('p', { class: 'text-slate-600 whitespace-pre-line text-base leading-relaxed font-semibold' }, this.state.aiInsight)
          ]) : null,

          h('div', { key: this.state.activeTab }, [
            this.state.activeTab === 'dashboard' ? h(Dashboard) :
            this.state.activeTab === 'accounts' ? h(ChartOfAccounts) :
            this.state.activeTab === 'journal' ? h(Journal) :
            this.state.activeTab === 'reports' ? h(Reports) :
            this.state.activeTab === 'billing' ? h(Billing) :
            this.state.activeTab === 'procurement' ? h(Procurement) :
            this.state.activeTab === 'payroll' ? h(Payroll) :
            this.state.activeTab === 'budgeting' ? h(Budgeting) :
            this.state.activeTab === 'assets' ? h(Assets) :
            this.state.activeTab === 'audit' ? h(AuditTrail) : null
          ])
        ])
      ])
    ]);
  }
});
