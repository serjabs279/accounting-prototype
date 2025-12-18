
export const AccountType = {
  ASSET: 'ASSET',
  LIABILITY: 'LIABILITY',
  EQUITY: 'EQUITY',
  REVENUE: 'REVENUE',
  EXPENSE: 'EXPENSE'
};

export const INITIAL_ACCOUNTS = [
  { id: '1', code: '1000', name: 'Cash at Bank', type: AccountType.ASSET, description: 'Main operating account', initialBalance: 50000 },
  { id: '2', code: '1100', name: 'Tuition Receivable', type: AccountType.ASSET, description: 'Unpaid student fees', initialBalance: 15000 },
  { id: '3', code: '1200', name: 'School Building', type: AccountType.ASSET, description: 'Fixed asset', initialBalance: 500000 },
  { id: '4', code: '2000', name: 'Accounts Payable', type: AccountType.LIABILITY, description: 'Unpaid supplier invoices', initialBalance: 2000 },
  { id: '5', code: '3000', name: 'Capital Fund', type: AccountType.EQUITY, description: 'Initial school funding', initialBalance: 563000 },
  { id: '6', code: '4000', name: 'Tuition Revenue', type: AccountType.REVENUE, description: 'Fees collected from students', initialBalance: 0 },
  { id: '7', code: '5000', name: 'Teacher Salaries', type: AccountType.EXPENSE, description: 'Academic staff payroll', initialBalance: 0 },
  { id: '8', code: '5100', name: 'Utility Expenses', type: AccountType.EXPENSE, description: 'Electricity and water', initialBalance: 0 }
];
