
import { defineComponent, h } from 'vue';
import { state, useAccounting } from '../state.js';

export default defineComponent({
  name: 'Budgeting',
  setup() {
    const { getAccountBalance } = useAccounting();
    return { state, getAccountBalance };
  },
  render() {
    return h('div', { class: 'bg-white p-12 rounded-[3rem] shadow-sm border border-emerald-50' }, [
      h('div', { class: 'mb-12' }, [
        h('h3', { class: 'text-2xl font-black text-slate-800 mb-2' }, 'Fiscal Year Budget Analysis'),
        h('p', { class: 'text-slate-400 text-sm font-medium' }, 'Planned Allocations vs Actual Spend (₱)')
      ]),
      h('div', { class: 'space-y-12' }, this.state.budgets.map(b => {
        const actual = this.getAccountBalance(b.accountId);
        const percent = Math.min(100, (actual / b.amount) * 100);
        const account = this.state.accounts.find(a => a.id === b.accountId);
        const variance = b.amount - actual;

        return h('div', [
          h('div', { class: 'flex justify-between items-end mb-6' }, [
            h('div', [
              h('p', { class: 'text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-2' }, account.name),
              h('p', { class: 'text-2xl font-black text-slate-800' }, `₱${actual.toLocaleString()} / ₱${b.amount.toLocaleString()}`)
            ]),
            h('div', { class: 'text-right' }, [
              h('p', { class: 'text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1' }, 'Utilization Gap'),
              h('p', { class: `text-sm font-black ${variance < 0 ? 'text-rose-500' : 'text-emerald-600'}` }, `₱${variance.toLocaleString()}`)
            ])
          ]),
          h('div', { class: 'h-3 bg-emerald-50 rounded-full overflow-hidden flex shadow-inner' }, [
            h('div', { 
              class: `h-full rounded-full transition-all duration-1000 ${percent > 90 ? 'bg-rose-400' : 'bg-emerald-400'}`, 
              style: { width: `${percent}%` }
            })
          ])
        ]);
      }))
    ]);
  }
});
