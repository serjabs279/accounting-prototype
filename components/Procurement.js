
import { defineComponent, h, reactive } from 'vue';
import { state, useAccounting } from '../state.js';

export default defineComponent({
  name: 'Procurement',
  setup() {
    const { postTransaction } = useAccounting();
    const ui = reactive({ showModal: false, supplierId: '', amount: 0, description: 'Office Supplies Purchase' });

    const postInvoice = () => {
      const vendor = state.suppliers.find(v => v.id === ui.supplierId);
      if (!vendor || ui.amount <= 0) return;
      
      vendor.payable = Number(vendor.payable) + Number(ui.amount);
      
      postTransaction(
        `Purchase Invoice: ${ui.description} from ${vendor.name}`,
        `PUR-${Date.now().toString().slice(-4)}`,
        [
          { accountId: '8', debit: ui.amount, credit: 0 },
          { accountId: '4', debit: 0, credit: ui.amount }
        ],
        'Procurement'
      );
      
      ui.showModal = false;
      ui.amount = 0;
    };

    return { state, ui, postInvoice };
  },
  render() {
    return h('div', { class: 'space-y-12' }, [
      h('div', { class: 'bg-white p-12 rounded-[3rem] shadow-sm border border-emerald-50' }, [
        h('div', { class: 'flex justify-between items-center mb-12' }, [
          h('h3', { class: 'text-2xl font-black text-slate-800' }, 'Accounts Payable Registry'),
          h('button', { 
            onClick: () => this.ui.showModal = true,
            class: 'green-gradient text-white px-10 py-4 rounded-2xl text-base font-black shadow-lg shadow-emerald-100' 
          }, '+ RECORD SUPPLIER INVOICE')
        ]),
        h('table', { class: 'w-full text-left' }, [
          h('thead', { class: 'text-xs font-black text-slate-400 uppercase tracking-widest' }, [
            h('tr', [
              h('th', { class: 'pb-8' }, 'Vendor Name'),
              h('th', { class: 'pb-8' }, 'Category'),
              h('th', { class: 'pb-8 text-right' }, 'Outstanding Debt')
            ])
          ]),
          h('tbody', { class: 'divide-y divide-emerald-50/50' }, this.state.suppliers.map(v => 
            h('tr', [
              h('td', { class: 'py-6 font-bold text-lg text-slate-800' }, v.name),
              h('td', { class: 'py-6 text-slate-500 font-semibold' }, v.category),
              h('td', { class: `py-6 text-right font-black text-xl ${v.payable > 0 ? 'text-rose-500' : 'text-emerald-600'}` }, `₱${Number(v.payable).toLocaleString()}`)
            ])
          ))
        ])
      ]),

      this.ui.showModal ? h('div', { class: 'fixed inset-0 bg-slate-800/50 flex items-center justify-center z-50 p-10' }, [
        h('div', { class: 'bg-white p-16 rounded-[4rem] w-full max-w-xl shadow-2xl border border-emerald-100 animate-fade relative' }, [
          h('button', { onClick: () => this.ui.showModal = false, class: 'absolute top-10 right-10 text-black font-black' }, '✕'),
          h('h3', { class: 'text-3xl font-black mb-12 text-slate-800' }, 'Supplier Invoice Entry'),
          h('div', { class: 'space-y-8' }, [
            h('div', [
              h('label', { class: 'block text-xs font-black text-slate-400 uppercase mb-3' }, 'Select Supplier'),
              h('select', { 
                value: this.ui.supplierId, 
                onChange: e => this.ui.supplierId = e.target.value,
                class: 'w-full p-5 bg-emerald-50/30 border-none rounded-3xl outline-none font-bold text-lg'
              }, [
                h('option', { value: '' }, 'Choose Vendor...'),
                ...this.state.suppliers.map(v => h('option', { value: v.id }, v.name))
              ])
            ]),
            h('div', [
              h('label', { class: 'block text-xs font-black text-slate-400 uppercase mb-3' }, 'Description'),
              h('input', { 
                value: this.ui.description,
                onInput: e => this.ui.description = e.target.value,
                class: 'w-full p-5 bg-emerald-50/30 border-none rounded-3xl font-bold text-base outline-none'
              })
            ]),
            h('div', [
              h('label', { class: 'block text-xs font-black text-slate-400 uppercase mb-3' }, 'Total Bill (₱)'),
              h('input', { 
                type: 'number',
                value: this.ui.amount,
                onInput: e => this.ui.amount = e.target.value,
                class: 'w-full p-5 bg-emerald-50/30 border-none rounded-3xl font-black text-3xl outline-none text-rose-500'
              })
            ]),
            h('div', { class: 'flex gap-6 pt-10' }, [
              h('button', { onClick: () => this.ui.showModal = false, class: 'flex-1 p-6 rounded-[2rem] font-black bg-red-600 text-white text-lg hover:bg-red-700' }, 'CANCEL'),
              h('button', { onClick: this.postInvoice, class: 'flex-[2] p-6 green-gradient text-white rounded-[2rem] font-black shadow-lg shadow-emerald-100 text-lg' }, 'POST TO AP')
            ])
          ])
        ])
      ]) : null
    ]);
  }
});
