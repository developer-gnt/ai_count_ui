import React, { useState } from 'react';
import {
  Building2,
  FileCheck,
  Shield,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Landmark,
  MapPin,
  Sparkles,
  BookOpen,
  X,
  CreditCard,
  Briefcase,
  Layers,
  Check
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { BusinessType } from '../../types';
import { validateGSTIN, validatePAN, formatINR } from '../../utils/formatters';

interface CreateOrganizationPageProps {
  navigate: (route: string) => void;
}

const INDIAN_STATES_WITH_CODES = [
  { code: '01', name: 'Jammu & Kashmir (01)' },
  { code: '02', name: 'Himachal Pradesh (02)' },
  { code: '03', name: 'Punjab (03)' },
  { code: '04', name: 'Chandigarh (04)' },
  { code: '06', name: 'Haryana (06)' },
  { code: '07', name: 'Delhi (07)' },
  { code: '08', name: 'Rajasthan (08)' },
  { code: '09', name: 'Uttar Pradesh (09)' },
  { code: '10', name: 'Bihar (10)' },
  { code: '19', name: 'West Bengal (19)' },
  { code: '24', name: 'Gujarat (24)' },
  { code: '27', name: 'Maharashtra (27)' },
  { code: '29', name: 'Karnataka (29)' },
  { code: '32', name: 'Kerala (32)' },
  { code: '33', name: 'Tamil Nadu (33)' },
  { code: '36', name: 'Telangana (36)' },
  { code: '37', name: 'Andhra Pradesh (37)' },
];

const POPULAR_BANKS = [
  'HDFC Bank',
  'ICICI Bank',
  'State Bank of India',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'Punjab National Bank',
  'Bank of Baroda',
  'IndusInd Bank',
  'Standard Chartered Bank',
  'Citibank N.A.',
];

export const CreateOrganizationPage: React.FC<CreateOrganizationPageProps> = ({ navigate }) => {
  const { createOrganization, currentUser, organizations } = useAccounting();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Identity & Constitution
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('Private Limited');
  const [industry, setIndustry] = useState('Manufacturing & Engineering');
  const [email, setEmail] = useState(currentUser?.email || 'accounts@newbusiness.in');
  const [phone, setPhone] = useState('+91 98200 12345');

  // Step 2: Statutory & Tax
  const [gstin, setGstin] = useState('27AAACN1234F1Z9');
  const [pan, setPan] = useState('AAACN1234F');
  const [gstType, setGstType] = useState<'Regular' | 'Composition' | 'SEZ Unit'>('Regular');
  const [tan, setTan] = useState('');
  const [udyamNo, setUdyamNo] = useState('');
  const [cin, setCin] = useState('');

  // Step 3: Location
  const [address, setAddress] = useState('Plot 88, Electronic Zone, Phase II');
  const [city, setCity] = useState('Mumbai');
  const [state, setState] = useState('Maharashtra (27)');
  const [pincode, setPincode] = useState('400093');
  const [branchName, setBranchName] = useState('Corporate Head Office');

  // Step 4: Accounting & Banking
  const [financialYear, setFinancialYear] = useState('2026–27');
  const [booksStartDate, setBooksStartDate] = useState('2026-04-01');
  const [bankName, setBankName] = useState('HDFC Bank');
  const [bankAccountType, setBankAccountType] = useState('Current Account');
  const [accountNumber, setAccountNumber] = useState('502000' + Math.floor(10000000 + Math.random() * 90000000));
  const [ifsc, setIfsc] = useState('HDFC0000060');
  const [bankBranch, setBankBranch] = useState('Corporate Mid-Town Branch');
  const [openingBalance, setOpeningBalance] = useState<number>(250000);
  const [chartOfAccountsTemplate, setChartOfAccountsTemplate] = useState('Indian GAAP & Schedule III Standard');
  const [eInvoicingEnabled, setEInvoicingEnabled] = useState(true);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const businessTypes: BusinessType[] = [
    'Private Limited',
    'Proprietorship',
    'Partnership',
    'LLP',
    'Public Limited',
    'Individual',
    'Trust',
    'Society',
    'Other',
  ];

  const industries = [
    'Manufacturing & Engineering',
    'Wholesale & Trading',
    'Software & IT Services (SaaS)',
    'Logistics, Supply Chain & Transport',
    'Professional Consulting & CA Practice',
    'Healthcare & Pharmaceuticals',
    'Retail & E-commerce',
    'Construction & Real Estate',
  ];

  const financialYears = ['2026–27', '2025–26', '2024–25'];

  const gstinValidation = validateGSTIN(gstin);
  const panValidation = validatePAN(pan);

  // Auto detect state from GSTIN code
  const handleGstinChange = (raw: string) => {
    const val = raw.toUpperCase().replace(/\s/g, '');
    setGstin(val);
    if (val.length >= 2) {
      const code = val.substring(0, 2);
      const matchedState = INDIAN_STATES_WITH_CODES.find((s) => s.code === code);
      if (matchedState) {
        setState(matchedState.name);
      }
    }
    if (val.length >= 12) {
      setPan(val.substring(2, 12));
    }
  };

  const handleNext = () => {
    setError('');
    if (step === 1) {
      if (!name.trim()) {
        setError('Please provide the legal business entity name.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (gstin.trim() && !gstinValidation.isValid) {
        setError('Invalid GSTIN format. Please enter a valid 15-character GSTIN or leave blank if unregistered.');
        return;
      }
      if (!pan.trim() || !panValidation.isValid) {
        setError('A valid 10-character Indian PAN is required for corporate registration.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!city.trim() || !state.trim()) {
        setError('Please provide the registered city and state.');
        return;
      }
      setStep(4);
    } else if (step === 4) {
      if (!accountNumber.trim()) {
        setError('Please provide a primary operating bank account number.');
        return;
      }
      setStep(5);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    setError('');
    try {
      await createOrganization({
        name: name.toUpperCase().trim(),
        tradeName: tradeName.trim() || undefined,
        businessType,
        gstin: gstin.toUpperCase().trim(),
        pan: pan.toUpperCase().trim(),
        financialYear,
        address,
        city,
        state,
        pincode,
        email,
        phone,
        bankName,
        accountType: bankAccountType,
        accountNumber,
        ifsc: ifsc.toUpperCase().trim(),
        branch: bankBranch,
        openingBalance: Number(openingBalance) || 0,
        industry,
        chartOfAccountsTemplate,
      });
      navigate('/dashboard');
    } catch (err: any) {
      const apiMessage = err?.message || err?.providerMessage;
      if (apiMessage) {
        setError(apiMessage);
      } else {
        setError('An error occurred while provisioning the business tenant.');
      }
      setLoading(false);
    }
  };

  const hasExistingOrgs = organizations && organizations.length > 0;

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col justify-between py-8 px-4 sm:px-6 font-sans">
      {/* Header Bar */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="AICounts"
            className="h-10 w-auto object-contain shrink-0"
          />
          <div className="border-l border-neutral-300 pl-3">
            <div className="text-[11px] font-bold tracking-wider text-neutral-900 uppercase font-mono">
              Enterprise Multi-Tenant
            </div>
            <div className="text-[10px] text-neutral-500 font-mono">
              Business Registration &amp; Setup
            </div>
          </div>
        </div>

        {hasExistingOrgs && (
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs text-neutral-600 hover:text-neutral-950 font-medium px-3 py-1.5 border border-neutral-300 rounded-xs bg-white hover:bg-neutral-50 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <X size={13} />
            <span>Cancel & Return to Workspace</span>
          </button>
        )}
      </div>

      {/* Progress Steps Header */}
      <div className="max-w-3xl mx-auto w-full mb-6">
        <div className="bg-white border border-neutral-200 rounded-xs p-3 shadow-2xs">
          <div className="grid grid-cols-5 gap-2">
            {[
              { num: 1, label: 'Identity', icon: Building2 },
              { num: 2, label: 'GST & Tax', icon: FileCheck },
              { num: 3, label: 'Place of Biz', icon: MapPin },
              { num: 4, label: 'Bank & Books', icon: Landmark },
              { num: 5, label: 'Launch', icon: Shield },
            ].map((s) => {
              const Icon = s.icon;
              const isActive = step === s.num;
              const isDone = step > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num < step) setStep(s.num as any);
                  }}
                  disabled={s.num > step}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-xs border text-center transition-all ${
                    isActive
                      ? 'bg-neutral-900 border-neutral-900 text-white shadow-2xs'
                      : isDone
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 cursor-pointer hover:bg-emerald-100'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    {isDone ? (
                      <Check size={12} className="text-emerald-700" />
                    ) : (
                      <Icon size={12} className={isActive ? 'text-white' : 'text-neutral-400'} />
                    )}
                    <span className="text-[10px] font-mono font-bold">0{s.num}</span>
                  </div>
                  <span className="text-[11px] font-medium leading-tight truncate w-full px-1">
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Wizard Form Card */}
      <div className="max-w-3xl mx-auto w-full bg-white border border-neutral-300 p-6 sm:p-8 rounded-xs shadow-2xs">
        {error && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xs flex items-center gap-2.5">
            <AlertCircle size={16} className="text-red-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* STEP 1: ENTITY IDENTITY & CONSTITUTION */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="border-b border-neutral-200 pb-3">
              <div className="text-xs font-mono uppercase text-neutral-500 mb-1">Step 01 of 05</div>
              <h2 className="text-lg font-bold text-neutral-950 tracking-tight flex items-center gap-2">
                <Building2 size={20} className="text-neutral-800" />
                <span>Entity Identity & Business Constitution</span>
              </h2>
              <p className="text-xs text-neutral-600 mt-1">
                Enter the official legal entity name as registered with MCA / ROC or the GST portal. Each business has completely isolated ledgers and records.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Legal Entity / Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  id="new-business-legal-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. BHARAT PRECISION ENGINEERING PVT LTD"
                  className="w-full text-xs px-3.5 py-2.5 border border-neutral-300 rounded-xs focus:outline-none focus:border-neutral-900 font-mono uppercase font-medium bg-neutral-50/50 focus:bg-white"
                />
                <p className="text-[10px] text-neutral-500 mt-1">This name will appear on all statutory Tax Invoices, GSTR-1, and financial statements.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Trade / Brand Name (Optional)
                </label>
                <input
                  type="text"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  placeholder="e.g. Bharat Precision Tools"
                  className="w-full text-xs px-3.5 py-2.5 border border-neutral-300 rounded-xs focus:outline-none focus:border-neutral-900 bg-neutral-50/50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Business Constitution Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                  className="w-full text-xs px-3.5 py-2.5 border border-neutral-300 rounded-xs focus:outline-none focus:border-neutral-900 bg-white"
                >
                  {businessTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Primary Industry Domain
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-neutral-300 rounded-xs focus:outline-none focus:border-neutral-900 bg-white"
                >
                  {industries.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Official Accounts Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="accounts@business.in"
                  className="w-full text-xs px-3.5 py-2.5 border border-neutral-300 rounded-xs focus:outline-none focus:border-neutral-900 bg-neutral-50/50 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Official Contact Phone
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98200 12345"
                  className="w-full text-xs px-3.5 py-2.5 border border-neutral-300 rounded-xs focus:outline-none focus:border-neutral-900 bg-neutral-50/50 focus:bg-white font-mono"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-200 flex justify-end">
              <button
                type="button"
                id="btn-step1-next"
                onClick={handleNext}
                className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold px-6 py-2.5 rounded-xs transition-colors flex items-center gap-2 shadow-2xs"
              >
                <span>Continue to Statutory & GST</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: STATUTORY & GST IDENTIFIERS */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="border-b border-neutral-200 pb-3">
              <div className="text-xs font-mono uppercase text-neutral-500 mb-1">Step 02 of 05</div>
              <h2 className="text-lg font-bold text-neutral-950 tracking-tight flex items-center gap-2">
                <FileCheck size={20} className="text-neutral-800" />
                <span>Statutory, GSTIN & Corporate Tax Identifiers</span>
              </h2>
              <p className="text-xs text-neutral-600 mt-1">
                Provide the 15-digit GSTIN and 10-digit PAN. State code and PAN are automatically extracted and verified.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-neutral-800">
                    Goods & Services Tax Identification Number (GSTIN)
                  </label>
                  <span
                    className={`text-[11px] font-mono font-medium ${
                      gstinValidation.isValid ? 'text-emerald-700 font-bold' : 'text-neutral-500'
                    }`}
                  >
                    {gstinValidation.message}
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={15}
                  value={gstin}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  placeholder="27AAACN1234F1Z9"
                  className={`w-full text-xs px-3.5 py-2.5 border rounded-xs font-mono uppercase font-semibold focus:outline-none ${
                    gstin && !gstinValidation.isValid
                      ? 'border-amber-400 bg-amber-50/40 text-amber-900'
                      : 'border-neutral-300 focus:border-neutral-900 bg-white'
                  }`}
                />
                <p className="text-[10px] text-neutral-500 mt-1">Leave blank only if unregistered / below turnover threshold.</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-neutral-800">
                    Permanent Account Number (PAN) <span className="text-red-500">*</span>
                  </label>
                  <span
                    className={`text-[11px] font-mono font-medium ${
                      panValidation.isValid ? 'text-emerald-700' : 'text-neutral-500'
                    }`}
                  >
                    {panValidation.message}
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={10}
                  required
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  placeholder="AAACN1234F"
                  className="w-full text-xs px-3.5 py-2.5 border border-neutral-300 rounded-xs font-mono uppercase font-semibold focus:outline-none focus:border-neutral-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  GST Registration Type
                </label>
                <select
                  value={gstType}
                  onChange={(e) => setGstType(e.target.value as any)}
                  className="w-full text-xs px-3.5 py-2.5 border border-neutral-300 rounded-xs focus:outline-none focus:border-neutral-900 bg-white font-medium"
                >
                  <option value="Regular">Regular Taxpayer (Monthly / QRMP)</option>
                  <option value="Composition">Composition Scheme Taxpayer</option>
                  <option value="SEZ Unit">SEZ Unit / Developer (Zero-rated)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Tax Deduction Account Number (TAN - for TDS)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={tan}
                  onChange={(e) => setTan(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  placeholder="MUMB12345A"
                  className="w-full text-xs px-3.5 py-2.5 border border-neutral-300 rounded-xs font-mono uppercase focus:outline-none focus:border-neutral-900 bg-neutral-50/50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  MSME / Udyam Registration No. (Optional)
                </label>
                <input
                  type="text"
                  value={udyamNo}
                  onChange={(e) => setUdyamNo(e.target.value.toUpperCase())}
                  placeholder="UDYAM-MH-01-0012345"
                  className="w-full text-xs px-3.5 py-2.5 border border-neutral-300 rounded-xs font-mono uppercase focus:outline-none focus:border-neutral-900 bg-neutral-50/50 focus:bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Corporate Identity Number (CIN / LLPIN - for Companies & LLPs)
                </label>
                <input
                  type="text"
                  maxLength={21}
                  value={cin}
                  onChange={(e) => setCin(e.target.value.toUpperCase())}
                  placeholder="U74999MH2024PTC123456"
                  className="w-full text-xs px-3.5 py-2.5 border border-neutral-300 rounded-xs font-mono uppercase focus:outline-none focus:border-neutral-900 bg-neutral-50/50 focus:bg-white"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-neutral-600 hover:text-neutral-950 font-medium px-4 py-2 border border-neutral-300 rounded-xs bg-white hover:bg-neutral-50 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <button
                type="button"
                id="btn-step2-next"
                onClick={handleNext}
                className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold px-6 py-2.5 rounded-xs transition-colors flex items-center gap-2 shadow-2xs"
              >
                <span>Continue to Place of Business</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: REGISTERED PLACE OF BUSINESS */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="border-b border-neutral-200 pb-3">
              <div className="text-xs font-mono uppercase text-neutral-500 mb-1">Step 03 of 05</div>
              <h2 className="text-lg font-bold text-neutral-950 tracking-tight flex items-center gap-2">
                <MapPin size={20} className="text-neutral-800" />
                <span>Principal Place of Business & Jurisdictional State</span>
              </h2>
              <p className="text-xs text-neutral-600 mt-1">
                Used to determine intra-state (CGST + SGST) versus inter-state (IGST) tax rules for invoices and e-Way bills.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Operating Unit / Branch Descriptor
                </label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. Corporate Head Office & Main Works"
                  className="w-full text-xs px-3.5 py-2.5 border border-neutral-300 rounded-xs focus:outline-none focus:border-neutral-900 bg-neutral-50/50 focus:bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Registered Premise / Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Door No, Building, Industrial Area / Street"
                  className="w-full text-xs px-3.5 py-2.5 border border-neutral-300 rounded-xs focus:outline-none focus:border-neutral-900 bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  City / Town <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="w-full text-xs px-3.5 py-2.5 border border-neutral-300 rounded-xs focus:outline-none focus:border-neutral-900 bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  State & GST State Code <span className="text-red-500">*</span>
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-neutral-300 rounded-xs focus:outline-none focus:border-neutral-900 bg-white font-medium"
                >
                  {INDIAN_STATES_WITH_CODES.map((st) => (
                    <option key={st.code} value={st.name}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  PIN Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="400093"
                  className="w-full text-xs px-3.5 py-2.5 border border-neutral-300 rounded-xs font-mono font-medium focus:outline-none focus:border-neutral-900 bg-white"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs text-neutral-600 hover:text-neutral-950 font-medium px-4 py-2 border border-neutral-300 rounded-xs bg-white hover:bg-neutral-50 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <button
                type="button"
                id="btn-step3-next"
                onClick={handleNext}
                className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold px-6 py-2.5 rounded-xs transition-colors flex items-center gap-2 shadow-2xs"
              >
                <span>Continue to Bank & Books</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: BANK ACCOUNT, FINANCIAL YEAR & ACCOUNTING STANDARDS */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="border-b border-neutral-200 pb-3">
              <div className="text-xs font-mono uppercase text-neutral-500 mb-1">Step 04 of 05</div>
              <h2 className="text-lg font-bold text-neutral-950 tracking-tight flex items-center gap-2">
                <Landmark size={20} className="text-neutral-800" />
                <span>Primary Bank Account, Financial Year & Ledger Books</span>
              </h2>
              <p className="text-xs text-neutral-600 mt-1">
                Configure your operating bank account for automated bank feed reconciliation and select the Chart of Accounts template.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Active Financial Year <span className="text-red-500">*</span>
                </label>
                <select
                  value={financialYear}
                  onChange={(e) => setFinancialYear(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-neutral-300 rounded-xs focus:outline-none focus:border-neutral-900 bg-white font-mono font-medium"
                >
                  {financialYears.map((fy) => (
                    <option key={fy} value={fy}>
                      FY {fy} (1 Apr – 31 Mar)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Books Beginning From Date
                </label>
                <input
                  type="date"
                  value={booksStartDate}
                  onChange={(e) => setBooksStartDate(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-neutral-300 rounded-xs focus:outline-none focus:border-neutral-900 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Primary Operating Bank Name <span className="text-red-500">*</span>
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-neutral-300 rounded-xs focus:outline-none focus:border-neutral-900 bg-white font-medium"
                >
                  {POPULAR_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Account Type
                </label>
                <select
                  value={bankAccountType}
                  onChange={(e) => setBankAccountType(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-neutral-300 rounded-xs focus:outline-none focus:border-neutral-900 bg-white"
                >
                  <option value="Current Account">Current Account (Business)</option>
                  <option value="Savings Account">Savings Account</option>
                  <option value="Cash Credit / Overdraft">Cash Credit / Overdraft (CC/OD)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Bank Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 50200018928374"
                  className="w-full text-xs px-3.5 py-2.5 border border-neutral-300 rounded-xs font-mono font-semibold focus:outline-none focus:border-neutral-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Bank IFSC Code
                </label>
                <input
                  type="text"
                  maxLength={11}
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  placeholder="HDFC0000060"
                  className="w-full text-xs px-3.5 py-2.5 border border-neutral-300 rounded-xs font-mono uppercase font-semibold focus:outline-none focus:border-neutral-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={bankBranch}
                  onChange={(e) => setBankBranch(e.target.value)}
                  placeholder="e.g. MIDC Industrial Branch"
                  className="w-full text-xs px-3.5 py-2.5 border border-neutral-300 rounded-xs focus:outline-none focus:border-neutral-900 bg-neutral-50/50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Opening Bank Ledger Balance (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(Number(e.target.value))}
                  placeholder="250000"
                  className="w-full text-xs px-3.5 py-2.5 border border-neutral-300 rounded-xs font-mono font-semibold focus:outline-none focus:border-neutral-900 bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Chart of Accounts Standard Template
                </label>
                <select
                  value={chartOfAccountsTemplate}
                  onChange={(e) => setChartOfAccountsTemplate(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-neutral-300 rounded-xs focus:outline-none focus:border-neutral-900 bg-white font-medium"
                >
                  <option value="Indian GAAP & Schedule III Standard">
                    Indian GAAP & Schedule III Standard (Tally & ERP Compliant)
                  </option>
                  <option value="Manufacturing & Industrial Standard">
                    Manufacturing & Industrial (Raw Materials, WIP, FG, Scrap)
                  </option>
                  <option value="SaaS & IT Technology Services">
                    SaaS & IT Technology Services (Subscriptions, Retainers, Cloud Hosting)
                  </option>
                  <option value="Wholesale & Trading Matrix">
                    Wholesale & Distribution (Trading, Freight Inward, High Volume SKUs)
                  </option>
                </select>
              </div>

              <div className="md:col-span-2 pt-2">
                <label className="flex items-center gap-3 cursor-pointer p-3 border border-neutral-200 rounded-xs bg-neutral-50 hover:bg-neutral-100/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={eInvoicingEnabled}
                    onChange={(e) => setEInvoicingEnabled(e.target.checked)}
                    className="w-4 h-4 text-neutral-900 border-neutral-300 rounded-xs focus:ring-0"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-neutral-900">Enable E-Invoicing & E-Way Bill Readiness</span>
                    <p className="text-[11px] text-neutral-500">Auto-generate IRN QR codes and JSON payloads for GST portal clearance.</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="text-xs text-neutral-600 hover:text-neutral-950 font-medium px-4 py-2 border border-neutral-300 rounded-xs bg-white hover:bg-neutral-50 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <button
                type="button"
                id="btn-step4-next"
                onClick={handleNext}
                className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold px-6 py-2.5 rounded-xs transition-colors flex items-center gap-2 shadow-2xs"
              >
                <span>Review & Confirm Registration</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: REVIEW, CONFIRMATION & REGISTRATION */}
        {step === 5 && (
          <div className="space-y-5">
            <div className="border-b border-neutral-200 pb-3">
              <div className="text-xs font-mono uppercase text-neutral-500 mb-1">Step 05 of 05</div>
              <h2 className="text-lg font-bold text-neutral-950 tracking-tight flex items-center gap-2">
                <Shield size={20} className="text-neutral-800" />
                <span>Review Tenant Configuration & Launch Workspace</span>
              </h2>
              <p className="text-xs text-neutral-600 mt-1">
                Please verify the registration parameters. Your account will be assigned the <span className="font-semibold text-neutral-900">Owner (Admin)</span> role with full ledger control.
              </p>
            </div>

            {/* High-density summary card */}
            <div className="bg-neutral-50 border border-neutral-300 rounded-xs divide-y divide-neutral-200 text-xs">
              <div className="p-3.5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <div className="text-[10px] font-mono text-neutral-500 uppercase">Legal Entity Name</div>
                  <div className="font-bold text-neutral-900 font-mono mt-0.5">{name}</div>
                  {tradeName && <div className="text-[11px] text-neutral-600">({tradeName})</div>}
                </div>
                <div>
                  <div className="text-[10px] font-mono text-neutral-500 uppercase">Constitution</div>
                  <div className="font-semibold text-neutral-900 mt-0.5">{businessType}</div>
                  <div className="text-[11px] text-neutral-600">{industry}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-neutral-500 uppercase">Financial Year</div>
                  <div className="font-bold text-emerald-800 font-mono mt-0.5">FY {financialYear}</div>
                  <div className="text-[11px] text-neutral-500">From {booksStartDate}</div>
                </div>
              </div>

              <div className="p-3.5 grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
                <div>
                  <div className="text-[10px] text-neutral-500 uppercase font-sans">GSTIN</div>
                  <div className="font-bold text-neutral-900 mt-0.5">{gstin || 'UNREGISTERED'}</div>
                  <div className="text-[10px] text-neutral-500 font-sans">{gstType}</div>
                </div>
                <div>
                  <div className="text-[10px] text-neutral-500 uppercase font-sans">PAN</div>
                  <div className="font-bold text-neutral-900 mt-0.5">{pan}</div>
                  {tan && <div className="text-[10px] text-neutral-500">TAN: {tan}</div>}
                </div>
                <div>
                  <div className="text-[10px] text-neutral-500 uppercase font-sans">State & Code</div>
                  <div className="font-bold text-neutral-900 font-sans mt-0.5">{state}</div>
                  <div className="text-[10px] text-neutral-500">{city} - {pincode}</div>
                </div>
              </div>

              <div className="p-3.5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <div className="text-[10px] font-mono text-neutral-500 uppercase">Primary Bank</div>
                  <div className="font-bold text-neutral-900 mt-0.5">{bankName}</div>
                  <div className="text-[10px] font-mono text-neutral-600">A/c: {accountNumber}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-neutral-500 uppercase">IFSC / Branch</div>
                  <div className="font-mono font-medium text-neutral-900 mt-0.5">{ifsc}</div>
                  <div className="text-[10px] text-neutral-500">{bankBranch}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-neutral-500 uppercase">Opening Balance</div>
                  <div className="font-bold text-neutral-900 font-mono mt-0.5">
                    {formatINR(openingBalance || 0)}
                  </div>
                  <div className="text-[10px] text-neutral-500">Auto-created in ledger</div>
                </div>
              </div>

              <div className="p-3.5 bg-neutral-100/70 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                  <span className="text-xs font-semibold text-neutral-900">Tenant Isolation Status:</span>
                  <span className="text-xs text-neutral-600">Dedicated Ledger, Bank Accounts & GST Registry</span>
                </div>
                <span className="px-2.5 py-0.5 bg-neutral-900 text-white text-[10px] font-bold font-mono rounded-xs">
                  ROLE: OWNER
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs rounded-xs flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Automated Workspace Provisioning:</span>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Upon completion, the system will initialize the Chart of Accounts ({chartOfAccountsTemplate}), opening balance journals, and switch you directly into the workspace.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="text-xs text-neutral-600 hover:text-neutral-950 font-medium px-4 py-2 border border-neutral-300 rounded-xs bg-white hover:bg-neutral-50 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>

              <button
                type="button"
                disabled={loading}
                id="btn-register-business-finish"
                onClick={handleFinish}
                className="bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold px-8 py-3 rounded-xs transition-colors flex items-center gap-2.5 shadow-xs"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Registering Business Tenant...</span>
                  </>
                ) : (
                  <>
                    <Building2 size={15} />
                    <span>Register Business & Launch Workspace</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="max-w-3xl mx-auto w-full mt-6 text-center text-[11px] text-neutral-500 font-mono flex items-center justify-center gap-4">
        <span>ISO-27001 Multi-Tenant Isolation</span>
        <span>•</span>
        <span>Schedule III & Tally ERP Chart of Accounts</span>
        <span>•</span>
        <span>Indian GST & E-Invoicing Compliant</span>
      </div>
    </div>
  );
};
