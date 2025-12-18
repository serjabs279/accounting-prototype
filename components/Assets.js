
import { defineComponent, h, reactive } from 'vue';
import { state, useAccounting } from '../state.js';

export default defineComponent({
  name: 'Assets',
  setup() {
    const { postTransaction } = useAccounting();
    const assets = [
      { id: '1', name: 'MacBook Lab (50 Units)', cost: 500000, dep: 50000 },
      { id: '2', name: 'SRPHS Main Building', cost: 12000000, dep: 240000 }
    ];

    const postDepreciation = (asset) => {
      postTransaction(
        `Depreciation: ${asset.name}`,
        'DEP-2024',
        [
          { accountId: '8', debit: asset.dep, credit: 0 },
          { accountId: '3', debit: 0, credit: asset.dep }
        ],
        'Assets'
      );
    };

    return { assets, postDepreciation };
  },
  render() {
    return h('div', { class: 'bg-white p-12 rounded-[3rem] shadow-sm border border-emerald-50' }, [
      h('h3', { class: 'text-2xl font-black mb-12 text-slate-800' }, 'Institutional Asset Registry'),
      h('div', { class: 'grid grid-cols-2 gap-10' }, this.assets.map(a => 
        h('div', { class: 'p-10 bg-emerald-50/20 rounded-[2.5rem] border border-emerald-50 relative' }, [
          h('div', { class: 'relative z-10' }, [
            h('p', { class: 'text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3' }, 'Facility / Equipment'),
            h('h4', { class: 'text-xl font-bold mb-8 text-slate-800' }, a.name),
            h('div', { class: 'flex gap-12' }, [
              h('div', [
                h('p', { class: 'text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1' }, 'Acquisition Cost'),
                h('p', { class: 'font-black text-slate-700' }, `₱${a.cost.toLocaleString()}`)
              ]),
              h('div', [
                h('p', { class: 'text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1' }, 'Current Dep.'),
                h('p', { class: 'font-black text-rose-500' }, `-₱${a.dep.toLocaleString()}`)
              ])
            ]),
            h('button', { 
              onClick: () => this.postDepreciation(a),
              class: 'mt-10 w-full py-4 bg-white border border-emerald-100 rounded-2xl text-[10px] font-black text-emerald-600 hover:green-gradient hover:text-white hover:border-transparent transition-all tracking-widest' 
            }, 'RECORD DEPRECIATION')
          ])
        ])
      ))
    ]);
  }
});
