
import { defineComponent, h } from 'vue';
import { state } from '../state.js';

export default defineComponent({
  name: 'Sidebar',
  setup() {
    const groups = [
      { name: 'Core', items: [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'accounts', label: 'Chart of Accounts', icon: '📖' },
        { id: 'journal', label: 'General Ledger', icon: '🖋️' }
      ]},
      { name: 'Operations', items: [
        { id: 'billing', label: 'Student Billing', icon: '🎓' },
        { id: 'procurement', label: 'Procurement', icon: '📦' },
        { id: 'payroll', label: 'Payroll & HR', icon: '👥' },
        { id: 'assets', label: 'Asset Manager', icon: '🏛️' }
      ]},
      { name: 'System', items: [
        { id: 'budgeting', label: 'Budgeting', icon: '📉' },
        { id: 'reports', label: 'Reports', icon: '📄' },
        { id: 'audit', label: 'Audit Log', icon: '🛡️' }
      ]}
    ];
    return { state, groups };
  },
  render() {
    return h('aside', { class: 'w-72 bg-[#064e3b] text-white flex flex-col h-full shadow-2xl z-20' }, [
      h('div', { class: 'p-8 pb-12' }, [
        h('div', { class: 'flex items-center gap-4' }, [
          h('div', { class: 'w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center font-black text-white text-xl shadow-lg' }, 'S'),
          h('div', [
            h('h2', { class: 'text-lg font-black tracking-tight' }, 'SRPHS HUB'),
            h('p', { class: 'text-[9px] text-emerald-400 font-bold tracking-[0.2em] uppercase opacity-80' }, 'Accounting')
          ])
        ])
      ]),
      
      h('nav', { class: 'flex-1 overflow-y-auto scrollbar-hide space-y-8 px-4' }, this.groups.map(group => h('div', [
        h('p', { class: 'px-4 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300/40 mb-3' }, group.name),
        h('div', { class: 'space-y-1' }, group.items.map(item => 
          h('button', {
            onClick: () => this.state.activeTab = item.id,
            class: `w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 font-bold text-sm ${
              this.state.activeTab === item.id 
              ? 'bg-white/10 text-white border-l-4 border-emerald-400' 
              : 'text-emerald-100/60 hover:bg-white/5 hover:text-white'
            }`
          }, [
            h('span', { class: 'text-lg' }, item.icon),
            item.label
          ])
        ))
      ]))),

      h('div', { class: 'p-6 mt-auto bg-emerald-950/40' }, [
        h('div', { class: 'flex items-center gap-3' }, [
          h('div', { class: 'w-10 h-10 rounded-full bg-emerald-800 flex items-center justify-center text-lg border border-emerald-700' }, '👤'),
          h('div', [
            h('p', { class: 'text-xs font-bold text-white' }, 'Admin Bursar'),
            h('p', { class: 'text-[9px] text-emerald-400 font-bold uppercase' }, 'Full Access')
          ])
        ])
      ])
    ]);
  }
});
