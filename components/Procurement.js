
import { defineComponent, h, reactive } from 'vue';
import { state, useAccounting, logAction } from '../state.js';

export default defineComponent({
  name: 'Procurement',
  setup() {
    const { postTransaction } = useAccounting();
    const ui = reactive({ 
      showModal: false, 
      showSupplierModal: false,
      supplierId: '', 
      amount: 0, 
      description: 'Office Supplies Purchase',
      // New Supplier Fields
      newSupplierName: '',
      newSupplierCategory: 'Supplies'
    });

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

    const addSupplier = () => {
      if (!ui.newSupplierName.trim()) return;

      const newVendor = {
        id: 'V' + Math.random().toString(36).substr(2, 4).toUpperCase(),
        name: ui.newSupplierName.trim(),
        category: ui.newSupplierCategory,
        payable: 0
      };

      state.suppliers.push(newVendor);
      logAction('Admin', `Registered new supplier: ${newVendor.name}`, 'Procurement');
      
      ui.showSupplierModal = false;
      ui.newSupplierName = '';
      ui.newSupplierCategory = 'Supplies';
    };

    return { state, ui, postInvoice, addSupplier };
  },
  render() {
    return h('div', { class: 'space-y-12 animate-fade' }, [
      h('div', { class: 'bg-white p-12 rounded-[3rem] shadow-sm border border-emerald-50' }, [
        h('div', { class: 'flex justify-between items-center mb-12' }, [
          h('div', [
            h('h3', { class: 'text-2xl font-black text-slate-800' }, 'Accounts Payable Registry'),
            h('p', { class: 'text-sm text-slate-400 font-bold mt-1' }, 'Manage school vendors and outstanding obligations.')
          ]),
          h('div', { class: 'flex gap-4' }, [
            h('button', { 
              onClick: () => this.ui.showSupplierModal = true,
              class: 'bg-white border-2 border-slate-100 text-slate-600 px-8 py-4 rounded-2xl text-base font-black hover:bg-slate-50 transition' 
            }, '+ REGISTER NEW VENDOR'),
            h('button', { 
              onClick: () => this.ui.showModal = true,
              class: 'green-gradient text-white px-10 py-4 rounded-2xl text-base font-black shadow-lg shadow-emerald-100' 
            }, '+ RECORD INVOICE')
          ])
        ]),
        h('table', { class: 'w-full text-left' }, [
          h('thead', { class: 'text-[10px] font-black text-slate-400 uppercase tracking-widest' }, [
            h('tr', [
              h('th', { class: 'pb-8 px-4' }, 'Vendor Name'),
              h('th', { class: 'pb-8 px-4' }, 'Category'),
              h('th', { class: 'pb-8 px-4 text-right' }, 'Outstanding Debt')
            ])
          ]),
          h('tbody', { class: 'divide-y divide-emerald-50/50' }, this.state.suppliers.map(v => 
            h('tr', { class: 'hover:bg-slate-50/50 transition' }, [
              h('td', { class: 'py-6 px-4 font-black text-lg text-slate-800' }, v.name),
              h('td', { class: 'py-6 px-4 text-slate-500 font-bold uppercase text-[10px] tracking-widest' }, [
                h('span', { class: 'bg-slate-100 px-3 py-1 rounded-full' }, v.category)
              ]),
              h('td', { class: `py-6 px-4 text-right font-black text-2xl ${v.payable > 0 ? 'text-rose-500' : 'text-emerald-600'}` }, `₱${Number(v.payable).toLocaleString()}`)
            ])
          ))
        ]),
        this.state.suppliers.length === 0 ? h('div', { class: 'p-20 text-center text-slate-300 italic' }, 'No suppliers registered.') : null
      ]),

      // MODAL: RECORD SUPPLIER INVOICE
      this.ui.showModal ? h('div', { class: 'fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-10' }, [
        h('div', { class: 'bg-white p-16 rounded-[4rem] w-full max-w-xl shadow-2xl border border-emerald-100 animate-fade relative' }, [
          h('button', { onClick: () => this.ui.showModal = false, class: 'absolute top-10 right-10 text-black font-black text-xl hover:opacity-50 transition' }, '✕'),
          h('h3', { class: 'text-3xl font-black mb-12 text-slate-800' }, 'Supplier Invoice Entry'),
          h('div', { class: 'space-y-8' }, [
            h('div', [
              h('label', { class: 'block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest' }, 'Select Supplier'),
              h('select', { 
                value: this.ui.supplierId, 
                onChange: e => this.ui.supplierId = e.target.value,
                class: 'w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-bold text-lg'
              }, [
                h('option', { value: '' }, 'Choose Vendor...'),
                ...this.state.suppliers.map(v => h('option', { value: v.id }, v.name))
              ])
            ]),
            h('div', [
              h('label', { class: 'block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest' }, 'Transaction Particulars'),
              h('input', { 
                value: this.ui.description,
                onInput: e => this.ui.description = e.target.value,
                placeholder: 'e.g. Monthly Electricity, Canteen Supplies',
                class: 'w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold text-base outline-none'
              })
            ]),
            h('div', [
              h('label', { class: 'block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest' }, 'Total Bill Amount (₱)'),
              h('input', { 
                type: 'number',
                value: this.ui.amount,
                onInput: e => this.ui.amount = e.target.value,
                class: 'w-full p-8 bg-slate-50 border border-slate-100 rounded-3xl font-black text-5xl outline-none text-rose-500 text-center shadow-inner'
              })
            ]),
            h('div', { class: 'flex gap-6 pt-10' }, [
              h('button', { onClick: () => this.ui.showModal = false, class: 'flex-1 p-6 rounded-[2rem] font-black bg-slate-100 text-slate-400 text-lg hover:bg-slate-200 transition' }, 'CANCEL'),
              h('button', { onClick: this.postInvoice, class: 'flex-[2] p-6 green-gradient text-white rounded-[2rem] font-black shadow-xl text-lg' }, 'POST TO ACCOUNTS PAYABLE')
            ])
          ])
        ])
      ]) : null,

      // MODAL: REGISTER NEW SUPPLIER
      this.ui.showSupplierModal ? h('div', { class: 'fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-10' }, [
        h('div', { class: 'bg-white p-16 rounded-[4rem] w-full max-w-xl shadow-2xl border border-slate-100 animate-fade relative' }, [
          h('button', { onClick: () => this.ui.showSupplierModal = false, class: 'absolute top-10 right-10 text-black font-black text-xl hover:opacity-50 transition' }, '✕'),
          h('h3', { class: 'text-3xl font-black mb-12 text-slate-800' }, 'Register New Vendor'),
          h('div', { class: 'space-y-8' }, [
            h('div', [
              h('label', { class: 'block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest' }, 'Supplier / Business Name'),
              h('input', { 
                value: this.ui.newSupplierName,
                onInput: e => this.ui.newSupplierName = e.target.value,
                placeholder: 'e.g. Global Tech Solutions Inc.',
                class: 'w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold text-lg outline-none'
              })
            ]),
            h('div', [
              h('label', { class: 'block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest' }, 'Business Category'),
              h('select', { 
                value: this.ui.newSupplierCategory, 
                onChange: e => this.ui.newSupplierCategory = e.target.value,
                class: 'w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-bold text-lg'
              }, [
                'Supplies', 'Utilities', 'Maintenance', 'Services', 'Equipment', 'Textbooks', 'Canteen'
              ].map(cat => h('option', { value: cat }, cat)))
            ]),
            h('div', { class: 'flex gap-6 pt-10' }, [
              h('button', { onClick: () => this.ui.showSupplierModal = false, class: 'flex-1 p-6 rounded-[2rem] font-black bg-slate-100 text-slate-400 text-lg hover:bg-slate-200 transition' }, 'DISCARD'),
              h('button', { onClick: this.addSupplier, class: 'flex-[2] py-6 green-gradient text-white rounded-[2rem] font-black shadow-xl text-lg' }, 'REGISTER SUPPLIER')
            ])
          ])
        ])
      ]) : null
    ]);
  }
});
