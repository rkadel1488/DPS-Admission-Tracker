"use client";

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCircle, 
  LayoutDashboard, 
  PlusCircle, 
  LogOut, 
  Download, 
  Search, 
  CheckCircle, 
  ClipboardList, 
  GraduationCap, 
  MessageSquare, 
  Loader2, 
  AlertCircle, 
  KeyRound,
  ShieldAlert,
  Database,
  Trash2,
  Edit2
} from 'lucide-react';

// Firebase Imports
import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut, 
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot,
  deleteDoc,
  updateDoc,
  doc
} from 'firebase/firestore';

// --- Configuration ---
const getEnv = (key: string) => {
  try {
    return typeof process !== 'undefined' ? process.env[key] : undefined;
  } catch (e) {
    return undefined;
  }
};

const firebaseConfig = {
  apiKey: getEnv("NEXT_PUBLIC_FIREBASE_API_KEY") || "AIzaSyA624_MFdmAHoMiS1eH2taAn7pjQK-srWk",
  authDomain: getEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN") || "dps-admission-tracker.firebaseapp.com",
  projectId: getEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID") || "dps-admission-tracker",
  storageBucket: getEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET") || "dps-admission-tracker.firebasestorage.app",
  messagingSenderId: getEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID") || "995022033480",
  appId: getEnv("NEXT_PUBLIC_FIREBASE_APP_ID") || "1:995022033480:web:685359eac01cd352edfe7d"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'dps-tracker-v1';

const APP_NAME = "DPS Admission Tracker";
const LOGO_URL = "https://dpsbiratnagar.edu.np/wp-content/uploads/2024/04/logo-1.jpg";

const getInternalEmail = (staffCode: string) => {
  const code = staffCode.trim().toLowerCase();
  return code.includes('@') ? code : `${code}@dps.tracker`;
};
const getStaffCodeFromEmail = (email: string | null) => email ? email.split('@')[0] : '';

export default function App() {
  const [user, setUser] = useState<any>(null); 
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard'); 
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [permissionError, setPermissionError] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        const staffCode = getStaffCodeFromEmail(currentUser.email);
        const isAdmin = staffCode === 'admin01';
        setView(isAdmin ? 'master' : 'dashboard');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setSubmissions([]);
      return;
    }
    setPermissionError(false);
    const submissionsCol = collection(db, 'artifacts', appId, 'public', 'data', 'admissions');
    const unsubscribe = onSnapshot(submissionsCol, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSubmissions(data.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      },
      (error) => {
        if (error.code === 'permission-denied') setPermissionError(true);
      }
    );
    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => await signOut(auth);

  const saveSubmission = async (formData: any) => {
    if (!user) return;
    const staffCode = getStaffCodeFromEmail(user.email);
    
    try {
      if (editingRecord) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'admissions', editingRecord.id);
        await updateDoc(docRef, {
          ...formData,
          lastUpdatedBy: staffCode,
          lastUpdatedTimestamp: new Date().toISOString()
        });
      } else {
        const newEntry = {
          userId: user.uid,
          staffCode: staffCode,
          userName: user.displayName || staffCode,
          timestamp: new Date().toISOString(),
          ...formData
        };
        const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'admissions');
        await addDoc(colRef, newEntry);
      }
      setEditingRecord(null);
      setView(staffCode === 'admin01' ? 'master' : 'dashboard');
    } catch (err: any) {
      if (err.code === 'permission-denied') setPermissionError(true);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!window.confirm("Are you sure you want to delete this admission record? This action cannot be undone.")) return;
    
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'admissions', recordId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete the record. Please check permissions.");
    }
  };

  const handleEditInitiation = (record: any) => {
    setEditingRecord(record);
    setView('form');
  };

  const handleCancelForm = () => {
    const staffCode = getStaffCodeFromEmail(user?.email);
    setEditingRecord(null);
    setView(staffCode === 'admin01' ? 'master' : 'dashboard');
  };

  const exportToExcel = (dataToExport: any[]) => {
    const headers = [
      "Staff Code", "Logged By", "Student Name", "Parent/Guardian Name", "Date of Visit", 
      "Address", "Contact No.", "Nationality", "Present School", 
      "Present Class", "Admission Sought (Class)", "Unanswered Questions", 
      "Feedback/Expectations", "Enquiry", "Registered", "Admitted", "Date Logged"
    ];
    const csvContent = [
      headers.join(","),
      ...dataToExport.map(item => [
        `"${item.staffCode || ''}"`,
        `"${item.userName || ''}"`,
        `"${item.studentName || ''}"`,
        `"${item.parentName || ''}"`,
        `"${item.dateOfVisit || ''}"`,
        `"${item.address || ''}"`,
        `"${item.contactNo || ''}"`,
        `"${item.nationality || ''}"`,
        `"${item.presentSchool || ''}"`,
        `"${item.presentClass || ''}"`,
        `"${item.admissionSought || ''}"`,
        `"${item.unansweredQuestions || ''}"`,
        `"${item.parentsFeedback || ''}"`,
        `"${item.isEnquiry || 'No'}"`,
        `"${item.isRegistered || 'No'}"`,
        `"${item.isAdmitted || 'No'}"`,
        `"${new Date(item.timestamp).toLocaleString()}"`
      ].join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `DPS_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f5f5] gap-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-slate-500 font-medium animate-pulse text-sm">Validating Credentials...</p>
      </div>
    );
  }

  const staffCode = getStaffCodeFromEmail(user?.email);
  const isAdmin = staffCode === 'admin01';

  return (
    <div className="min-h-screen bg-[#f5f5f5] font-sans text-slate-900">
      {!user ? (
        <LoginScreen />
      ) : (
        <>
          <Navbar user={user} isAdmin={isAdmin} staffCode={staffCode} onLogout={handleLogout} setView={setView} currentView={view} />
          {permissionError && (
            <div className="max-w-7xl mx-auto px-4 mt-4">
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-sm">
                <ShieldAlert size={20} className="shrink-0" />
                <div className="text-sm font-medium">Database Permission Error: Please update your Firestore Rules.</div>
              </div>
            </div>
          )}
          <main className="max-w-7xl mx-auto p-4 md:p-8">
            {view === 'dashboard' && (
              <UserDashboard 
                submissions={submissions.filter(s => s.userId === user.uid)} 
                onExport={() => exportToExcel(submissions.filter(s => s.userId === user.uid))}
                onAddNew={() => { setEditingRecord(null); setView('form'); }}
                onEdit={handleEditInitiation}
                onDelete={handleDeleteRecord}
              />
            )}
            {view === 'form' && (
              <AdmissionForm 
                onSubmit={saveSubmission} 
                onCancel={handleCancelForm} 
                initialData={editingRecord}
              />
            )}
            {view === 'master' && isAdmin && (
              <MasterDashboard 
                submissions={submissions} 
                onExport={() => exportToExcel(submissions)}
                onAddNew={() => { setEditingRecord(null); setView('form'); }}
                onDelete={handleDeleteRecord}
                onEdit={handleEditInitiation}
              />
            )}
          </main>
        </>
      )}
    </div>
  );
}

function LoginScreen() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [staffCode, setStaffCode] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: any) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    const email = getInternalEmail(staffCode);
    try {
      if (isResettingPassword) {
        // Firebase Auth protects accounts from arbitrary password changes.
        // Without an email link or the old password, only Firebase Admin SDK can change passwords.
        setError('Direct resets require Firebase Admin SDK. Please contact an administrator to reset your password, or use email verification.');
        // setIsResettingPassword(false);
      } else if (isRegistering) {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName: name });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      if (isResettingPassword) {
        setError('Failed to reset. Ensure this staff code exists.');
      } else {
        setError(isRegistering ? 'Registration failed. Check details.' : 'Invalid Credentials. Ensure this staff code is registered.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-900 to-indigo-950 px-6 py-12">
      <div className="bg-white w-full max-w-md rounded-[32px] shadow-[0_20px_40px_rgba(0,0,0,0.15)] overflow-hidden">
        <div className="p-10 text-center border-b border-slate-100">
          <img src={LOGO_URL} alt="DPS Logo" className="h-16 w-16 object-cover rounded-full mx-auto mb-6 shadow-sm ring-4 ring-slate-50" />
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{APP_NAME}</h1>
          <p className="text-slate-500 mt-2 text-sm">
            {isResettingPassword ? 'Reset Password' : (isRegistering ? 'New Registration' : 'Staff Admission Portal')}
          </p>
        </div>
        <form onSubmit={handleAuth} className="p-10 space-y-5 bg-slate-50/50">
          {error && <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl flex items-start gap-3"><ShieldAlert size={18} className="shrink-0 mt-0.5" /><span>{error}</span></div>}
          {successMsg && <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl flex items-start gap-3"><CheckCircle size={18} className="shrink-0 mt-0.5" /><span>{successMsg}</span></div>}
          
          {isRegistering && !isResettingPassword && <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest pl-1">Full Name</label><input type="text" required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm transition-all" value={name} onChange={(e) => setName(e.target.value)} /></div>}
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest pl-1">Staff Code</label>
            <div className="relative">
              <UserCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" required className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm transition-all" value={staffCode} onChange={(e) => setStaffCode(e.target.value)} placeholder="e.g. admin01" />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest pl-1">{isResettingPassword ? 'New Password' : 'Password'}</label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="password" required className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm transition-all" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
          </div>
          
          {!isResettingPassword && !isRegistering && (
            <div className="text-right">
              <button type="button" onClick={() => { setIsResettingPassword(true); setError(''); setSuccessMsg(''); }} className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">Forgot Password?</button>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full py-4 mt-2 rounded-xl text-white font-bold bg-blue-700 hover:bg-blue-800 transition-all shadow-[0_4px_14px_0_rgba(29,78,216,0.39)] flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={20} /> : (isResettingPassword ? 'Reset Password' : (isRegistering ? 'Register' : 'Log In'))}
          </button>
          
          <div className="pt-6 text-center flex flex-col gap-3">
            {isResettingPassword ? (
              <button type="button" onClick={() => setIsResettingPassword(false)} className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">Back to Login</button>
            ) : (
              <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">{isRegistering ? 'Back to Login' : 'Need to register a code? Click here'}</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function DashboardTable({ submissions, title, subtitle, onExport, onAddNew, isAdminView = false, onDelete, onEdit }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const filtered = submissions.filter((s: any) => 
    s.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.staffCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.parentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.userName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-slate-800 tracking-[-0.02em]">{title}</h2>
            {isAdminView && <span className="bg-amber-100 text-amber-800 text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-bold">Master List</span>}
          </div>
          <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onExport} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm text-sm font-semibold">
            <Download size={16} /> <span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={onAddNew} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-md text-sm font-semibold">
            <PlusCircle size={16} /> <span>New Entry</span>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatItem label="Total Records" value={filtered.length} color="blue" />
        <StatItem label="Registered" value={filtered.filter((s: any) => s.isRegistered === 'Yes').length} color="amber" />
        <StatItem label="Admitted" value={filtered.filter((s: any) => s.isAdmitted === 'Yes').length} color="emerald" />
      </div>
      
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200 overflow-hidden mt-8">
        <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between">
          <div className="max-w-md w-full relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search by student, parent, or staff name..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-transparent focus:border-slate-200 rounded-xl outline-none text-sm transition-all focus:bg-white focus:ring-4 focus:ring-slate-50" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-[#fcfcfc] text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                {isAdminView && <th className="px-6 py-4 whitespace-nowrap">Logged By</th>}
                <th className="px-6 py-4">Student Info</th>
                <th className="px-6 py-4 text-center">Class</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4 text-right">Visit Date</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors text-sm group">
                    {isAdminView && (
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-slate-800 leading-tight">{item.userName || 'Unknown'}</span>
                          <span className="text-[10px] font-medium text-slate-400 monospace tracking-wider">{item.staffCode || 'N/A'}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 text-base">{item.studentName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Parent: <span className="font-medium text-slate-600">{item.parentName}</span></div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">{item.admissionSought}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-1.5">
                        <StatusBubble label="E" title="Enquiry" active={item.isEnquiry === 'Yes'} color="blue" />
                        <StatusBubble label="R" title="Registered" active={item.isRegistered === 'Yes'} color="amber" />
                        <StatusBubble label="A" title="Admitted" active={item.isAdmitted === 'Yes'} color="emerald" />
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600 text-[13px]">{item.contactNo}</td>
                    <td className="px-6 py-4 text-right text-slate-500 tabular-nums text-[13px]">{item.dateOfVisit}</td>
                    <td className="px-6 py-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-center gap-1">
                        {onEdit && (
                          <button 
                            onClick={() => onEdit(item)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Record"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {onDelete && (
                          <button 
                            onClick={() => onDelete(item.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAdminView ? 7 : 6} className="px-6 py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                       <Search size={32} className="text-slate-300" />
                       <p className="font-medium text-sm">No entries found.</p>
                       <p className="text-xs text-slate-400">Try adjusting your search terms.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBubble({ label, active, color, title }: any) {
  const activeStyles: any = { 
    blue: 'bg-blue-600 text-white shadow-sm ring-1 ring-inset ring-blue-700/50', 
    amber: 'bg-amber-500 text-white shadow-sm ring-1 ring-inset ring-amber-600/50', 
    emerald: 'bg-emerald-600 text-white shadow-sm ring-1 ring-inset ring-emerald-700/50' 
  };
  const inactiveStyles = 'bg-slate-50 text-slate-300 border border-slate-200';
  
  return (
    <div title={title} className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all cursor-help ${active ? activeStyles[color] : inactiveStyles}`}>
      {label}
    </div>
  );
}

function StatItem({ label, value, color }: any) {
  const colors: any = { 
    blue: 'border-blue-100 bg-blue-50/50 text-blue-700', 
    amber: 'border-amber-100 bg-amber-50/50 text-amber-700', 
    emerald: 'border-emerald-100 bg-emerald-50/50 text-emerald-700' 
  };
  return (
    <div className={`p-5 rounded-2xl flex flex-col ${colors[color]}`}>
       <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</div>
       <div className="text-4xl font-light mt-2 tracking-tight tabular-nums">{value}</div>
    </div>
  );
}

const UserDashboard = (props: any) => (<DashboardTable {...props} title="Your Entries" subtitle="Manage and view the admission logs you have recorded" />);
const MasterDashboard = (props: any) => (<DashboardTable {...props} title="Master Database" subtitle="Complete view of all staff admissions across the institution" isAdminView={true} onDelete={props.onDelete} onEdit={props.onEdit} />);

function AdmissionForm({ onSubmit, onCancel, initialData }: any) {
  const [formData, setFormData] = useState({ 
    teacherCode: '', studentName: '', parentName: '', dateOfVisit: new Date().toISOString().split('T')[0], 
    address: '', contactNo: '', nationality: 'Nepali', presentSchool: '', presentClass: '', 
    admissionSought: '', unansweredQuestions: '', parentsFeedback: '', isEnquiry: 'Yes', isRegistered: 'No', isAdmitted: 'No' 
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        teacherCode: initialData.teacherCode || '',
        studentName: initialData.studentName || '',
        parentName: initialData.parentName || '',
        dateOfVisit: initialData.dateOfVisit || new Date().toISOString().split('T')[0],
        address: initialData.address || '',
        contactNo: initialData.contactNo || '',
        nationality: initialData.nationality || 'Nepali',
        presentSchool: initialData.presentSchool || '',
        presentClass: initialData.presentClass || '',
        admissionSought: initialData.admissionSought || '',
        unansweredQuestions: initialData.unansweredQuestions || '',
        parentsFeedback: initialData.parentsFeedback || '',
        isEnquiry: initialData.isEnquiry || 'Yes',
        isRegistered: initialData.isRegistered || 'No',
        isAdmitted: initialData.isAdmitted || 'No'
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: any) => { 
    e.preventDefault(); 
    setIsSubmitting(true); 
    await onSubmit(formData); 
    setIsSubmitting(false); 
  };
  
  const handleChange = (e: any) => { 
    const { name, value, type, checked } = e.target; 
    setFormData((prev: any) => ({ ...prev, [name]: type === 'checkbox' ? (checked ? 'Yes' : 'No') : value })); 
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden border border-slate-200 mb-20">
      <div className="bg-slate-900 p-8 text-white flex items-center justify-between border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{initialData ? 'Edit Record' : 'New Admission'}</h2>
          <p className="text-slate-400 text-sm mt-1.5 font-medium">{initialData ? 'Update student and interaction details' : 'Log a new student interaction into the tracker'}</p>
        </div>
        <ClipboardList size={36} className="text-slate-700" />
      </div>
      <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-8 text-sm bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
          <FormInput label="Teacher Code" name="teacherCode" value={formData.teacherCode} onChange={handleChange} required />
          <FormInput label="Date of Visit" name="dateOfVisit" value={formData.dateOfVisit} onChange={handleChange} type="date" required />
          <FormInput label="Contact No." name="contactNo" value={formData.contactNo} onChange={handleChange} required />
          <FormInput label="Student Name" name="studentName" value={formData.studentName} onChange={handleChange} required />
          <FormInput label="Parent Name" name="parentName" value={formData.parentName} onChange={handleChange} required />
          <FormInput label="Nationality" name="nationality" value={formData.nationality} onChange={handleChange} />
          <div className="lg:col-span-3">
            <FormInput label="Residential Address" name="address" value={formData.address} onChange={handleChange} />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-8 pt-8 border-t border-slate-100">
          <FormInput label="Present School" name="presentSchool" value={formData.presentSchool} onChange={handleChange} />
          <FormSelect label="Present Class" name="presentClass" value={formData.presentClass} onChange={handleChange} options={["Nursery", "LKG", "UKG", ...Array.from({length: 12}, (_, i) => `Grade ${i+1}`)]} />
          <FormSelect label="Seeking Admission In" name="admissionSought" value={formData.admissionSought} onChange={handleChange} required options={["Nursery", "LKG", "UKG", ...Array.from({length: 12}, (_, i) => `Grade ${i+1}`)]} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8 pt-8 border-t border-slate-100">
          <FormTextArea label="Unresolved Questions" name="unansweredQuestions" value={formData.unansweredQuestions} onChange={handleChange} placeholder="Any questions left unanswered?" />
          <FormTextArea label="Parent Expectations" name="parentsFeedback" value={formData.parentsFeedback} onChange={handleChange} placeholder="What does the parent expect?" />
        </div>
        
        <div className="pt-8 border-t border-slate-100">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-4">Admission Status</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatusToggle label="Enquiry Made" name="isEnquiry" value={formData.isEnquiry} onChange={handleChange} icon={<MessageSquare size={16} />} />
            <StatusToggle label="Registered" name="isRegistered" value={formData.isRegistered} onChange={handleChange} icon={<CheckCircle size={16} />} />
            <StatusToggle label="Admitted" name="isAdmitted" value={formData.isAdmitted} onChange={handleChange} icon={<GraduationCap size={16} />} />
          </div>
        </div>
        
        <div className="flex flex-col-reverse sm:flex-row gap-4 pt-8 mt-8 border-t border-slate-100">
          <button type="button" onClick={onCancel} className="px-8 py-3.5 rounded-xl font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors w-full sm:w-auto">Cancel</button>
          <div className="flex-1"></div>
          <button type="submit" disabled={isSubmitting} className="px-10 py-3.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 w-full sm:w-auto shadow-md shadow-slate-900/10">
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (initialData ? 'Save Changes' : 'Record Entry')}
          </button>
        </div>
      </form>
    </div>
  );
}

const Navbar = ({ isAdmin, staffCode, onLogout, setView, currentView }: any) => (
  <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
      <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView(isAdmin ? 'master' : 'dashboard')}>
        <img src={LOGO_URL} alt="Logo" className="h-8 w-8 rounded-full object-cover shadow-sm group-hover:scale-105 transition-transform" /> 
        <span className="font-bold text-slate-800 tracking-tight hidden sm:block">DPS <span className="font-normal text-slate-500">Tracker</span></span>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={() => setView(isAdmin ? 'master' : 'dashboard')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition text-sm font-semibold ${['dashboard', 'master'].includes(currentView) ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}><LayoutDashboard size={16} /> Home</button>
        <div className="h-6 w-px bg-slate-200 mx-2"></div>
        <div className="text-right hidden sm:block">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">User</div>
          <div className="text-sm font-semibold text-slate-800 leading-tight mt-0.5">{staffCode}</div>
        </div>
        <button onClick={onLogout} className="p-2 -mr-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition" title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </div>
  </nav>
);

function FormInput({ label, required, ...props }: any) { 
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
        {label} {required && <span className="text-red-400 font-normal ml-auto text-lg leading-none">*</span>}
      </label>
      <input {...props} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm focus:border-slate-400 focus:ring-4 focus:ring-slate-50 transition-all font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-normal" />
    </div>
  ); 
}

function FormSelect({ label, options, required, ...props }: any) { 
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
        {label} {required && <span className="text-red-400 font-normal ml-auto text-lg leading-none">*</span>}
      </label>
      <select {...props} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm focus:border-slate-400 focus:ring-4 focus:ring-slate-50 transition-all cursor-pointer font-medium text-slate-800 appearance-none">
        <option value="" className="font-normal">Select...</option>
        {options.map((opt: any) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  ); 
}

function FormTextArea({ label, ...props }: any) { 
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">{label}</label>
      <textarea {...props} rows={3} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none resize-none text-sm focus:border-slate-400 focus:ring-4 focus:ring-slate-50 transition-all font-medium text-slate-800 placeholder:font-normal placeholder:text-slate-400" />
    </div>
  ); 
}

function StatusToggle({ label, name, value, onChange, icon }: any) { 
  const isActive = value === 'Yes'; 
  return (
    <label className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer select-none group ${isActive ? 'bg-slate-900 border-slate-900 shadow-md shadow-slate-900/10' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
      <div className={`transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-500'}`}>
        {icon}
      </div>
      <span className={`text-sm font-semibold transition-colors flex-1 ${isActive ? 'text-white' : 'text-slate-600 group-hover:text-slate-800'}`}>{label}</span>
      <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${isActive ? 'bg-white border-white text-slate-900' : 'bg-slate-50 border-slate-200'}`}>
        {isActive && <CheckCircle size={14} className="stroke-[3px]" />}
      </div>
      <input type="checkbox" name={name} checked={isActive} onChange={onChange} className="sr-only" />
    </label>
  ); 
}
