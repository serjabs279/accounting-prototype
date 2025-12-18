
import { reactive, computed } from 'vue';
import { AccountType, INITIAL_ACCOUNTS } from './constants.js';

export const state = reactive({
  activeTab: 'dashboard',
  accounts: [...INITIAL_ACCOUNTS],
  entries: [
    {
      id: 'init-1',
      date: '2024-01-01',
      description: 'Opening Balance Setup',
      reference: 'SYS-INIT',
      lines: [
        { accountId: '1', debit: 50000, credit: 0 },
        { accountId: '5', debit: 0, credit: 50000 }
      ],
      meta: {}
    }
  ],
  
  students: [
    { id: 'S1', name: 'Juan Dela Cruz', grade: 'Grade 7', balance: 5000 },
    { id: 'S2', name: 'Maria Santos', grade: 'Grade 7', balance: 0 }
  ],
  feeCategories: ['Tuition', 'Miscellaneous', 'Lab Fees', 'Library Fees', 'Sports Fee', 'Uniform'],
  
  feeTemplates: [
    { 
      id: 'T1', 
      name: 'Grade 7 Standard Package',
      gradeLevel: 'Grade 7', 
      items: [
        { category: 'Tuition', amount: 15000 },
        { category: 'Miscellaneous', amount: 2500 }
      ]
    }
  ],
  
  suppliers: [
    { id: 'V1', name: 'National Book Store', category: 'Supplies', payable: 1250 }
  ],
  
  staff: [
    { 
      id: 'ST1', 
      name: 'Prof. Ricardo Silva', 
      position: 'Senior High Teacher', 
      category: 'Faculty', 
      basicPay: 35000,
      deductionProfile: {
        statutory: { sss: 1200, pagIbig: 200, philHealth: 450 },
        custom: []
      },
      loan: { principal: 10000, balance: 8000, termsRemaining: 8, monthlyAmortization: 1000 }
    },
    { 
      id: 'ST2', 
      name: 'Elena Gomez', 
      position: 'Administrative Staff', 
      category: 'Admin', 
      basicPay: 22000,
      deductionProfile: {
        statutory: { sss: 800, pagIbig: 200, philHealth: 300 },
        custom: []
      },
      loan: { principal: 0, balance: 0, termsRemaining: 0, monthlyAmortization: 0 }
    }
  ],

  payrollSettings: {
    institutionalDeductions: [
      { id: 'd1', name: 'T-Shirt Fee', value: 350 },
      { id: 'd2', name: 'Community Alimony', value: 100 },
      { id: 'd3', name: 'Offering/Donation', value: 50 }
    ],
    wTaxThreshold: 20833,
    wTaxRate: 0.15
  },

  assets: [
    { id: 'A1', name: 'Computer Lab 1 (Set of 30)', cost: 750000, dep: 15000, dateAcquired: '2023-01-15' }
  ],
  budgets: [
    { accountId: '7', amount: 2000000, period: '2024' }
  ],
  payrollRecords: [],
  auditLogs: [],
  
  aiInsight: '',
  isAnalyzing: false
});

export const logAction = (user, action, module) => {
  state.auditLogs.unshift({
    timestamp: new Date().toLocaleString(),
    user,
    action,
    module
  });
};

export const useAccounting = () => {
  const getAccountBalance = (accountId) => {
    const account = state.accounts.find(a => a.id === accountId);
    if (!account) return 0;
    let balance = Number(account.initialBalance) || 0;
    state.entries.forEach(entry => {
      entry.lines.forEach(line => {
        if (line.accountId === accountId) {
          if (account.type === AccountType.ASSET || account.type === AccountType.EXPENSE) {
            balance += (Number(line.debit) - Number(line.credit));
          } else {
            balance += (Number(line.credit) - Number(line.debit));
          }
        }
      });
    });
    return balance;
  };

  const postTransaction = (description, reference, lines, module, meta = {}) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    state.entries.push({
      id,
      date: new Date().toISOString().split('T')[0],
      description,
      reference,
      lines,
      meta
    });
    logAction('Admin', description, module);
  };

  const summary = computed(() => {
    let totalAssets = 0, totalLiabilities = 0, totalEquity = 0, totalRevenue = 0, totalExpenses = 0, totalSystemDebit = 0, totalSystemCredit = 0;
    state.accounts.forEach(acc => {
      const bal = getAccountBalance(acc.id);
      if (acc.type === AccountType.ASSET) totalAssets += bal;
      if (acc.type === AccountType.LIABILITY) totalLiabilities += bal;
      if (acc.type === AccountType.EQUITY) totalEquity += bal;
      if (acc.type === AccountType.REVENUE) totalRevenue += bal;
      if (acc.type === AccountType.EXPENSE) totalExpenses += bal;
    });
    state.entries.forEach(entry => {
      entry.lines.forEach(line => {
        totalSystemDebit += (Number(line.debit) || 0);
        totalSystemCredit += (Number(line.credit) || 0);
      });
    });
    return {
      totalAssets, totalLiabilities, totalEquity, totalRevenue, totalExpenses, totalSystemDebit, totalSystemCredit,
      netIncome: totalRevenue - totalExpenses,
      totalAR: state.students.reduce((sum, s) => sum + Number(s.balance), 0)
    };
  });

  return { getAccountBalance, postTransaction, summary };
};
