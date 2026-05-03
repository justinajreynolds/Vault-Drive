'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { File, FileSpreadsheet, FileText, Folder, Home, Image as ImgIcon, Search, Trash2, Upload, UserCircle2, Video } from 'lucide-react';

type Nav = 'dashboard' | 'files' | 'recent' | 'trash' | 'activity' | 'plans';
type Plan = { id: string; name: string; storage: string; price: string; features: string[]; current?: boolean; popular?: boolean };

type Item = { id: string; name: string; type: 'folder' | 'pdf' | 'image' | 'video' | 'sheet'; size: string; date: string; trashed?: boolean };

const plans: Plan[] = [
  { id: 'free', name: 'Free', storage: '256 GB', price: '$0/month', features: ['256 GB storage', 'File preview', 'Share via link', 'All file types'], current: true },
  { id: 'pro', name: 'Pro', storage: '500 GB', price: '$4.99/month', features: ['Priority uploads', '30-day trash', 'Email support'], popular: true },
  { id: 'premium', name: 'Premium', storage: '1 TB', price: '$9.99/month', features: ['1 TB storage', 'Faster uploads', 'Advanced sharing'] },
  { id: 'premium_plus', name: 'Premium+', storage: '2 TB', price: '$19.99/month', features: ['2 TB storage', 'Activity export', 'Priority support'] }
];

const items: Item[] = [
  { id: '1', name: 'Videos', type: 'folder', size: '—', date: 'May 2, 2026' },
  { id: '2', name: 'Design Assets', type: 'folder', size: '—', date: 'May 1, 2026' },
  { id: '3', name: 'Project Proposal.pdf', type: 'pdf', size: '2.3 MB', date: 'Apr 29, 2026' },
  { id: '4', name: 'Banner Design.png', type: 'image', size: '1.7 MB', date: 'May 1, 2026' },
  { id: '5', name: 'Q1 Report.xlsx', type: 'sheet', size: '332 KB', date: 'Apr 27, 2026' }
];

export function LoginShell() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [active, setActive] = useState<Nav>('dashboard');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => items.filter((f) => f.name.toLowerCase().includes(query.toLowerCase())), [query]);

  if (!loggedIn) {
    return (
      <main className="auth">
        <div className="card">
          <h1>VaultDrive</h1>
          <p>Secure cloud storage with folder browsing, trash restore, timeline, and exports.</p>
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button onClick={() => setLoggedIn(Boolean(email && password))}>Login / Sign up</button>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside>
        <div className="logo">VaultDrive</div>
        {[
          ['dashboard', Home],
          ['files', Folder],
          ['recent', File],
          ['trash', Trash2],
          ['activity', FileText],
          ['plans', UserCircle2]
        ].map(([key, Icon]) => (
          <button key={key} className={active === key ? 'nav active' : 'nav'} onClick={() => setActive(key as Nav)}><Icon size={18} />{key}</button>
        ))}
      </aside>
      <section>
        <header>
          <div className="search"><Search size={16} /><input placeholder="Search files..." value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <button className="btn"><Upload size={16} />Upload</button>
        </header>
        {active === 'dashboard' && <Dashboard />}
        {active === 'files' && <Files items={filtered} />}
        {active === 'trash' && <Trash />}
        {active === 'activity' && <Activity />}
        {active === 'plans' && <Plans />}
        {active === 'recent' && <Files items={filtered.slice(2)} />}
      </section>
    </main>
  );
}

function Dashboard() { return <div className="panel"><h2>Good to see you</h2><p>{format(new Date(), 'EEEE, MMMM d, yyyy')}</p><div className="stats"><Card t="Total Files" v="7"/><Card t="Folders" v="2"/><Card t="Starred" v="1"/><Card t="Storage Used" v="0%"/></div></div>; }
function Card({t,v}:{t:string;v:string}){return <div className="stat"><h3>{v}</h3><span>{t}</span></div>}
function iconFor(type: Item['type']) { if (type==='folder') return <Folder/>; if(type==='pdf') return <FileText/>; if(type==='image') return <ImgIcon/>; if(type==='video') return <Video/>; if(type==='sheet') return <FileSpreadsheet/>; return <File/>; }
function Files({ items }: { items: Item[] }) { return <div className="panel"><h2>My Files</h2><div className="file-grid">{items.map((item)=><div className="file-card" key={item.id}>{iconFor(item.type)}<h4>{item.name}</h4><p>{item.size} · {item.date}</p><div className="actions"><button>Preview</button><button>Download</button><button>Rename</button><button>Delete</button><button>Export Word</button><button>Export GDocs</button><button>Export Excel</button></div></div>)}</div></div>; }
function Trash(){ return <div className="panel"><h2>Trash</h2><p>Restore deleted files within 30 days.</p><button className="btn">Restore selected</button></div>; }
function Activity(){ return <div className="panel"><h2>Activity timeline</h2><ul><li>Uploaded Project Proposal.pdf · 2h ago</li><li>Created folder Design Assets · Yesterday</li><li>Moved Banner Design.png to Trash · Yesterday</li></ul></div>; }
function Plans(){ return <div className="panel"><h2>Choose your plan</h2><div className="file-grid">{plans.map((p)=><div className="file-card" key={p.id}><h3>{p.name}</h3><p>{p.storage}</p><strong>{p.price}</strong><ul>{p.features.map((f)=><li key={f}>{f}</li>)}</ul><button className="btn">{p.current ? 'Current plan' : 'Upgrade'}</button></div>)}</div></div>; }
