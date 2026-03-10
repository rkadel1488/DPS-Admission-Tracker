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
  updateProfile 
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
const getEnv = (key) => {
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

const getInternalEmail = (staffCode) => `${staffCode.trim().toLowerCase()}@dps.tracker`;
const getStaffCodeFromEmail = (email) => email ? email.split('@')[0] : '';

export default function App() {
  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard'); 
  const [submissions, setSubmissions] = useState([]);
  const [permissionError, setPermissionError] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

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
        setSubmissions(data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      },
      (error) => {
        if (error.code === 'permission-denied') setPermissionError(true);
      }
    );
    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => await signOut(auth);

  const saveSubmission = async (formData) => {
    if (!user) return;
    const staffCode = getStaffCodeFromEmail(user.email);
    
    try {
      if (editingRecord) {
        // Update existing record
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'admissions', editingRecord.id);
        await updateDoc(docRef, {
          ...formData,
          lastUpdatedBy: staffCode,
          lastUpdatedTimestamp: new Date().toISOString()
        });
      } else {
        // Add new record
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
    } catch (err) {
      if (err.code === 'permission-denied') setPermissionError(true);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm("Are you sure you want to delete this admission record? This action cannot be undone.")) return;
    
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'admissions', recordId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete the record. Please check permissions.");
    }
  };

  const handleEditInitiation = (record) => {
    setEditingRecord(record);
    setView('form');
  };

  const handleCancelForm = () => {
    const staffCode = getStaffCodeFromEmail(user?.email);
    setEditingRecord(null);
    setView(staffCode === 'admin01' ? 'master' : 'dashboard');
  };

  const exportToExcel = (dataToExport) => {
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-slate-500 font-medium animate-pulse text-sm">Validating Credentials...</p>
      </div>
    );
  }

  const staffCode = getStaffCodeFromEmail(user?.email);
  const isAdmin = staffCode === 'admin01';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {!user ? (
        <LoginScreen />
      ) : (
        <>
          <Navbar user={user} isAdmin={isAdmin} staffCode={staffCode} onLogout={handleLogout} setView={setView} currentView={view} />
          {permissionError && (
            <div className="max-w-7xl mx-auto px-4 mt-4">
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm">
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
  const [staffCode, setStaffCode] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const email = getInternalEmail(staffCode);
    try {
      if (isRegistering) {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName: name });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(isRegistering ? 'Registration failed. Check details.' : 'Invalid Credentials. Ensure this staff code is registered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-900 to-indigo-950">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8 text-center bg-white border-b">
          <img src={LOGO_URL} alt="DPS Logo" className="h-20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{APP_NAME}</h1>
          <p className="text-slate-500 mt-1">{isRegistering ? 'New Registration' : 'Staff Admission Portal'}</p>
        </div>
        <form onSubmit={handleAuth} className="p-8 space-y-4">
          {error && <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl flex items-start gap-3"><ShieldAlert size={18} className="shrink-0 mt-0.5" /><span>{error}</span></div>}
          {isRegistering && <div className="space-y-1"><label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Full Name</label><input type="text" required className="w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={name} onChange={(e) => setName(e.target.value)} /></div>}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Staff Code</label>
            <div className="relative">
              <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" required className="w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={staffCode} onChange={(e) => setStaffCode(e.target.value)} placeholder="e.g. admin01" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="password" required className="w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full py-4 rounded-xl text-white font-bold bg-blue-700 hover:bg-blue-800 transition-all shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={20} /> : (isRegistering ? 'Register' : 'Log In')}</button>
          <div className="pt-4 text-center border-t mt-4"><button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-sm font-semibold text-blue-600 hover:underline">{isRegistering ? 'Back to Login' : 'Need to register a code? Click here'}</button></div>
        </form>
      </div>
    </div>
  );
}

function DashboardTable({ submissions, title, subtitle, onExport, onAddNew, isAdminView = false, onDelete, onEdit }) {
  const [searchTerm, setSearchTerm] = useState('');
  const filtered = submissions.filter(s => 
    s.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.staffCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.parentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.userName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h2>
            {isAdminView && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-amber-200">Master List</span>}
          </div>
          <p className="text-slate-500 text-sm">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onExport} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition shadow-sm text-sm font-medium">
            <Download size={16} /> <span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={onAddNew} className="flex items-center gap-2 px-4 py-2.5 bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition shadow-md text-sm font-medium">
            <PlusCircle size={16} /> <span>New Entry</span>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatItem label="Total Records" value={filtered.length} icon={<Database size={16}/>} color="blue" />
        <StatItem label="Registered" value={filtered.filter(s => s.isRegistered === 'Yes').length} icon={<CheckCircle size={16}/>} color="amber" />
        <StatItem label="Admitted" value={filtered.filter(s => s.isAdmitted === 'Yes').length} icon={<GraduationCap size={16}/>} color="emerald" />
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b bg-slate-50/50 flex items-center justify-between">
          <div className="max-w-md w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search by student, parent, or staff name..." className="w-full pl-10 pr-4 py-2 bg-white border rounded-lg outline-none text-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
              <tr>
                {isAdminView && <th className="px-6 py-4">Logged By</th>}
                <th className="px-6 py-4">Student Info</th>
                <th className="px-6 py-4 text-center">Class</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4 text-right">Visit Date</th>
                {isAdminView && <th className="px-6 py-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition text-sm">
                    {isAdminView && (
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-slate-800 leading-tight">{item.userName || 'Unknown'}</span>
                          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{item.staffCode || 'N/A'}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{item.studentName}</div>
                      <div className="text-[10px] text-slate-500">Parent: {item.parentName}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">{item.admissionSought}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-1">
                        <StatusBubble label="E" active={item.isEnquiry === 'Yes'} color="blue" />
                        <StatusBubble label="R" active={item.isRegistered === 'Yes'} color="amber" />
                        <StatusBubble label="A" active={item.isAdmitted === 'Yes'} color="emerald" />
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">{item.contactNo}</td>
                    <td className="px-6 py-4 text-right text-slate-500">{item.dateOfVisit}</td>
                    {isAdminView && (
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => onEdit(item)}
                            className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Record"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => onDelete(item.id)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAdminView ? 7 : 5} className="px-6 py-16 text-center text-slate-400 italic">No entries found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBubble({ label, active, color }) {
  const styles = { blue: active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-300', amber: active ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-300', emerald: active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-300' };
  return <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black ${styles[color]}`}>{label}</div>;
}

function StatItem({ label, value, icon, color }) {
  const colors = { blue: 'border-blue-200 bg-blue-50 text-blue-700', amber: 'border-amber-200 bg-amber-50 text-amber-700', emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
  return (<div className={`p-4 border rounded-xl flex items-center justify-between ${colors[color]}`}><div><div className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</div><div className="text-xl font-black mt-1">{value}</div></div><div className="opacity-40">{icon}</div></div>);
}

const UserDashboard = (props) => (<DashboardTable {...props} title="Your Entries" subtitle="View and manage the admissions you've logged" />);
const MasterDashboard = (props) => (<DashboardTable {...props} title="Master Database" subtitle="Complete view of all staff admissions" isAdminView={true} onDelete={props.onDelete} onEdit={props.onEdit} />);

function AdmissionForm({ onSubmit, onCancel, initialData }) {
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

  const handleSubmit = async (e) => { 
    e.preventDefault(); 
    setIsSubmitting(true); 
    await onSubmit(formData); 
    setIsSubmitting(false); 
  };
  
  const handleChange = (e) => { 
    const { name, value, type, checked } = e.target; 
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? (checked ? 'Yes' : 'No') : value })); 
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 mb-20">
      <div className="bg-blue-950 p-6 text-white flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{initialData ? 'Edit Admission Record' : 'New Admission Record'}</h2>
          <p className="text-blue-300 text-xs mt-1">{initialData ? 'Update student details' : 'Fill in the student details to save to cloud'}</p>
        </div>
        <ClipboardList size={32} className="opacity-30" />
      </div>
      <form onSubmit={handleSubmit} className="p-8 space-y-8 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormInput label="Teacher Code" name="teacherCode" value={formData.teacherCode} onChange={handleChange} required />
          <FormInput label="Date of Visit" name="dateOfVisit" value={formData.dateOfVisit} onChange={handleChange} type="date" required />
          <FormInput label="Contact No." name="contactNo" value={formData.contactNo} onChange={handleChange} required />
          <FormInput label="Student Name" name="studentName" value={formData.studentName} onChange={handleChange} required />
          <FormInput label="Parent Name" name="parentName" value={formData.parentName} onChange={handleChange} required />
          <FormInput label="Nationality" name="nationality" value={formData.nationality} onChange={handleChange} />
          <div className="md:col-span-3">
            <FormInput label="Residential Address" name="address" value={formData.address} onChange={handleChange} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
          <FormInput label="Present School" name="presentSchool" value={formData.presentSchool} onChange={handleChange} />
          <FormSelect label="Present Class" name="presentClass" value={formData.presentClass} onChange={handleChange} options={["Nursery", "LKG", "UKG", ...Array.from({length: 12}, (_, i) => `Grade ${i+1}`)]} />
          <FormSelect label="Seeking Admission In" name="admissionSought" value={formData.admissionSought} onChange={handleChange} required options={["Nursery", "LKG", "UKG", ...Array.from({length: 12}, (_, i) => `Grade ${i+1}`)]} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
          <FormTextArea label="Unresolved Questions" name="unansweredQuestions" value={formData.unansweredQuestions} onChange={handleChange} />
          <FormTextArea label="Parent Expectations" name="parentsFeedback" value={formData.parentsFeedback} onChange={handleChange} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border">
          <StatusToggle label="Enquiry" name="isEnquiry" value={formData.isEnquiry} onChange={handleChange} />
          <StatusToggle label="Registered" name="isRegistered" value={formData.isRegistered} onChange={handleChange} />
          <StatusToggle label="Admitted" name="isAdmitted" value={formData.isAdmitted} onChange={handleChange} />
        </div>
        <div className="flex gap-4 pt-4">
          <button type="button" onClick={onCancel} className="flex-1 py-4 border rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-blue-700 text-white rounded-xl font-bold hover:bg-blue-800 transition flex items-center justify-center gap-2">
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : (initialData ? 'Update Record' : 'Save Record')}
          </button>
        </div>
      </form>
    </div>
  );
}

const Navbar = ({ isAdmin, staffCode, onLogout, setView, currentView }) => (<nav className="bg-white border-b sticky top-0 z-50 shadow-sm"><div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center"><div className="flex items-center gap-3 cursor-pointer" onClick={() => setView(isAdmin ? 'master' : 'dashboard')}><img src={LOGO_URL} alt="Logo" className="h-10" /><span className="font-black text-blue-900 hidden sm:block">DPS TRACKER</span></div><div className="flex items-center gap-4"><button onClick={() => setView(isAdmin ? 'master' : 'dashboard')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition text-xs font-bold ${['dashboard', 'master'].includes(currentView) ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}><LayoutDashboard size={16} /> Home</button><div className="h-8 w-px bg-slate-200 mx-1"></div><div className="text-right"><div className="text-[10px] font-bold text-slate-400 uppercase leading-none">Code</div><div className="text-sm font-black text-slate-800 leading-tight">{staffCode}</div></div><button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition"><LogOut size={20} /></button></div></div></nav>);
function FormInput({ label, required, ...props }) { return (<div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{label} {required && '*'}</label><input {...props} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-blue-500/20" /></div>); }
function FormSelect({ label, options, required, ...props }) { return (<div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{label} {required && '*'}</label><select {...props} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"><option value="">Select Class...</option>{options.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>); }
function FormTextArea({ label, ...props }) { return (<div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{label}</label><textarea {...props} rows="2" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none resize-none text-sm focus:ring-2 focus:ring-blue-500/20 transition-all" /></div>); }
function StatusToggle({ label, name, value, onChange }) { const isActive = value === 'Yes'; return (<label className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer ${isActive ? 'bg-white border-blue-600 ring-2 ring-blue-50' : 'bg-slate-50 border-transparent text-slate-400'}`}><span className={`text-[10px] font-bold ${isActive ? 'text-blue-700' : ''}`}>{label}</span><input type="checkbox" name={name} checked={isActive} onChange={onChange} className="w-4 h-4 rounded accent-blue-600 cursor-pointer" /></label>); }
