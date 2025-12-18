
import { defineComponent, h, ref } from 'vue';
import { state, useAccounting } from '../state.js';
import { AccountType } from '../constants.js';

export default defineComponent({
  name: 'Reports',
  setup() {
    const { summary, getAccountBalance } = useAccounting();
    const type = ref('BS'); 
    return { summary, getAccountBalance, state, type };
  },
  render() {
    const assets = this.state.accounts.filter(a => a.type === AccountType.ASSET);
    const liab = this.state.accounts.filter(a => a.type === AccountType.LIABILITY);
    const rev = this.state.accounts.filter(a => a.type === AccountType.REVENUE);
    const exp = this.state.accounts.filter(a => a.type === AccountType.EXPENSE);

    const Row = (label, amt, bold = false) => h('div', { class: `flex justify-between py-4 ${bold ? 'font-black border-t border-emerald-100 text-slate-900 mt-4 pt-4' : 'text-slate-500 text-sm font-medium'}` }, [
      h('span', label),
      h('span', `₱${amt.toLocaleString()}`)
    ]);

    return h('div', { class: 'max-w-3xl mx-auto space-y-12' }, [
      h('div', { class: 'flex gap-4 bg-white p-2 rounded-[2rem] w-fit shadow-sm border border-emerald-50' }, [
        h('button', { onClick: () => this.type = 'BS', class: `px-10 py-3 rounded-2xl text-[10px] font-black tracking-widest transition ${this.type === 'BS' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400'}` }, 'BALANCE SHEET'),
        h('button', { onClick: () => this.type = 'PL', class: `px-10 py-3 rounded-2xl text-[10px] font-black tracking-widest transition ${this.type === 'PL' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400'}` }, 'INCOME STATEMENT')
      ]),

      h('div', { class: 'bg-white p-20 rounded-[4rem] shadow-xl border border-emerald-50 relative' }, [
        h('div', { class: 'absolute top-0 left-0 w-full h-3 green-gradient rounded-t-[4rem]' }),
        h('div', { class: 'text-center mb-24' }, [
          h('h2', { class: 'text-3xl font-black uppercase tracking-[0.3em] text-slate-800' }, this.type === 'BS' ? 'Balance Sheet' : 'Income Statement'),
          h('p', { class: 'text-emerald-600 text-xs font-black tracking-[0.4em] uppercase mt-4' }, `SRPHS HUB Institutional Registry`),
          h('p', { class: 'text-slate-300 text-[10px] font-bold mt-2 uppercase tracking-widest' }, `Period Ending ${new Date().toLocaleDateString()}`)
        ]),

        this.type === 'BS' ? h('div', { class: 'space-y-12' }, [
          h('section', [
            h('h4', { class: 'text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 border-b border-emerald-50 pb-2' }, 'Current & Non-Current Assets'),
            assets.map(a => Row(a.name, this.getAccountBalance(a.id))),
            Row('TOTAL INSTITUTIONAL ASSETS', this.summary.totalAssets, true)
          ]),
          h('section', [
            h('h4', { class: 'text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 border-b border-emerald-50 pb-2' }, 'Liabilities & Obligations'),
            liab.map(a => Row(a.name, this.getAccountBalance(a.id))),
            Row('TOTAL INSTITUTIONAL LIABILITIES', this.summary.totalLiabilities, true)
          ]),
          h('section', [
             h('h4', { class: 'text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 border-b border-emerald-50 pb-2' }, 'Owner’s Equity'),
             Row('Retained Surplus (Current Period)', this.summary.netIncome),
             Row('TOTAL NET WORTH & EQUITY', this.summary.totalEquity + this.summary.netIncome, true)
          ])
        ]) : h('div', { class: 'space-y-12' }, [
          h('section', [
            h('h4', { class: 'text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-8 border-b border-emerald-50 pb-2' }, 'Revenue Streams'),
            rev.map(a => Row(a.name, this.getAccountBalance(a.id))),
            Row('TOTAL OPERATING REVENUE', this.summary.totalRevenue, true)
          ]),
          h('section', [
            h('h4', { class: 'text-[10px] font-black text-rose-300 uppercase tracking-[0.2em] mb-8 border-b border-emerald-50 pb-2' }, 'Operating Disbursements'),
            exp.map(a => Row(a.name, this.getAccountBalance(a.id))),
            Row('TOTAL OPERATING EXPENSES', this.summary.totalExpenses, true)
          ]),
          h('section', { class: 'pt-12' }, [
            Row('NET OPERATING SURPLUS / DEFICIT', this.summary.netIncome, true)
          ])
        ]),

        h('div', { class: 'mt-32 grid grid-cols-2 gap-32 text-center text-[10px] text-slate-300 font-bold uppercase tracking-[0.25em]' }, [
          h('div', { class: 'border-t border-emerald-100 pt-6 italic' }, 'Office of the Chief Bursar'),
          h('div', { class: 'border-t border-emerald-100 pt-6 italic' }, 'Institutional Principal')
        ])
      ])
    ]);
  }
});
