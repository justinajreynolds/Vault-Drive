'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { File, FileSpreadsheet, FileText, Folder, Home, Image as ImgIcon, Search, Trash2, Upload, UserCircle2, Video } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

type Nav = 'dashboard' | 'files' | 'recent' | 'trash' | 'activity' | 'plans';
type Item = { id: string; name: string; type: 'folder' | 'pdf' | 'image' | 'video' | 'sheet'; size: string; date: string };
const supabase = createClient();

export function AuthScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
    else router.push('/app');
    setLoading(false);
  };

  const signUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setMessage(error ? error.message : 'Check your email to confirm sign up.');
    setLoading(false);
  };

  return <main className="auth"><div className="card"><h1>VaultDrive</h1><p>Connect this repository to your Supabase project using .env.local values.</p><input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} /><input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /><button onClick={signIn} disabled={loading}>{loading ? 'Loading...' : 'Login'}</button><button onClick={signUp} disabled={loading}>Sign up</button><small>{message}</small></div></main>;
}

const items: Item[] = [
  { id: '1', name: 'Videos', type: 'folder', size: '—', date: 'May 2, 2026' },
  { id: '2', name: 'Design Assets', type: 'folder', size: '—', date: 'May 1, 2026' },
  { id: '3', name: 'Project Proposal.pdf', type: 'pdf', size: '2.3 MB', date: 'Apr 29, 2026' },
  { id: '4', name: 'Banner Design.png', type: 'image', size: '1.7 MB', date: 'May 1, 2026' },
  { id: '5', name: 'Q1 Report.xlsx', type: 'sheet', size: '332 KB', date: 'Apr 27, 2026' }
];

export function VaultApp() {
  const router = useRouter();
  const [active, setActive] = useState<Nav>('dashboard');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => items.filter((f) => f.name.toLowerCase().includes(query.toLowerCase())), [query]);
  const signOut = async () => { await supabase.auth.signOut(); router.push('/'); };
  return (<main className="app-shell"><aside><div className="logo">VaultDrive</div>{[['dashboard', Home],['files', Folder],['recent', File],['trash', Trash2],['activity', FileText],['plans', UserCircle2]].map(([key, Icon]) => <button key={key} className={active === key ? 'nav active' : 'nav'} onClick={() => setActive(key as Nav)}><Icon size={18} />{key}</button>)}<button className="nav" onClick={signOut}>Sign out</button></aside><section><header><div className="search"><Search size={16} /><input placeholder="Search files..." value={query} onChange={(e) => setQuery(e.target.value)} /></div><button className="btn"><Upload size={16} />Upload</button></header>{active === 'dashboard' && <div className="panel"><h2>Good to see you</h2><p>{format(new Date(), 'EEEE, MMMM d, yyyy')}</p></div>}{active !== 'dashboard' && <Files items={active === 'recent' ? filtered.slice(2) : filtered} />}</section></main>);
}

function iconFor(type: Item['type']) { if (type==='folder') return <Folder/>; if(type==='pdf') return <FileText/>; if(type==='image') return <ImgIcon/>; if(type==='video') return <Video/>; if(type==='sheet') return <FileSpreadsheet/>; return <File/>; }
function Files({ items }: { items: Item[] }) { return <div className="panel"><h2>My Files</h2><div className="file-grid">{items.map((item)=><div className="file-card" key={item.id}>{iconFor(item.type)}<h4>{item.name}</h4><p>{item.size} · {item.date}</p><div className="actions"><button>Preview</button><button>Download</button><button>Rename</button><button>Delete</button><button>Restore</button><button>Export Word</button><button>Export GDocs</button><button>Export Excel</button></div></div>)}</div></div>; }
