import { useEffect, useRef, useState } from 'react';
import { Camera, Check, Heart, Image, MessageCircle, PawPrint, Send, Sparkles, Trash2, UserRound, Users, X } from 'lucide-react';
import type { Look, PoseId } from '@/game/lifestyle-types';
import { RESIDENTS } from '@/game/resident-data';
import { addPhoto, captionPhoto, deletePhoto, isPhotoImage, loadSocial, MAX_PHOTOS, publishPhoto, saveSocial, togglePhotoLike, type SocialState, type StoredPhoto } from '@/game/social';
import { Panel } from '@/ui/Panel';
import '@/ui/social.css';

const POSES: { id: PoseId; label: string; symbol: string }[] = [
  { id: 'wave', label: 'Wave', symbol: '↗' }, { id: 'peace', label: 'Peace', symbol: 'V' },
  { id: 'heart', label: 'Heart', symbol: '♡' }, { id: 'kiss', label: 'Kiss', symbol: '✧' },
];
type PhotoStudioProps = {
  onClose(): void; capture(): string | null; onPose(pose: PoseId): void;
  onCompanion(id: string | null): void; followers: number; onFollowers(value: number): void;
  look: Look; zone: string; initialCompanion?: string | null;
};

export function PhotoStudio({ onClose, capture, onPose, onCompanion, followers, onFollowers, look, zone, initialCompanion = null }: PhotoStudioProps) {
  const [social, setSocial] = useState<SocialState>(() => { const saved = loadSocial(); return { ...saved, followers: Math.max(saved.followers, followers) }; });
  const [pose, setPose] = useState<PoseId>('peace');
  const [companion, setCompanion] = useState<string | null>(initialCompanion);
  const [view, setView] = useState<'camera' | 'album' | 'feed'>('camera');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState('Choose your pose, then make a memory.');
  const [flash, setFlash] = useState(false);
  const initialCallbacks = useRef({ onPose, onCompanion, initialCompanion });
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selected = social.photos.find(photo => photo.id === selectedId);
  useEffect(() => {
    const callbacks = initialCallbacks.current;
    callbacks.onPose('peace'); callbacks.onCompanion(callbacks.initialCompanion);
    return () => { callbacks.onCompanion(null); callbacks.onPose('idle'); if (flashTimer.current) clearTimeout(flashTimer.current); };
  }, []);

  const commit = (next: SocialState, message?: string) => {
    const saved = saveSocial(next);
    setSocial(saved.state);
    if (saved.state.followers !== followers) onFollowers(saved.state.followers);
    setStatus(!saved.persisted ? 'Saved for this visit. Your device could not keep a permanent copy.' : saved.trimmed ? 'Saved! Older photos were cleared to make room.' : message ?? 'Saved to your album.');
  };
  const shoot = () => {
    const image = capture();
    if (!isPhotoImage(image)) { setStatus('The camera is getting ready. Try another shot in a moment.'); return; }
    const name = companion === 'pet' ? 'your pet' : RESIDENTS.find(resident => resident.id === companion)?.name ?? null;
    const next = addPhoto(social, { image, pose, companionId: companion, companionName: name, zone, look });
    commit(next, `Photo saved · ${next.photos.length}/${MAX_PHOTOS} memories. Open Album to share it.`);
    setFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(false), 180);
  };
  const publish = (photo: StoredPhoto) => {
    const result = publishPhoto(social, photo.id, RESIDENTS.map(resident => resident.name));
    commit(result.state, result.gained ? `Your DreamFeed friends loved it! +${result.gained} followers.` : 'Shared! Try a new look, pose, place or co-star to earn more followers.');
    setSelectedId(null); setView('feed');
  };
  const choosePose = (id: PoseId) => { setPose(id); onPose(id); };
  const chooseCompanion = (id: string | null) => { setCompanion(id); onCompanion(id); };
  const openView = (next: 'album' | 'feed') => { setView(next); setSelectedId(null); };

  return <>
    {flash ? <div className="camera-flash" aria-hidden="true" /> : null}
    <div className="photo-studio">
      <Panel title="Photo studio" subtitle={`${zone} · ${social.followers} DreamFeed followers`} onClose={onClose} variant="stage">
        <div className="photo-pose-strip" aria-label="Photo pose">
          {POSES.map(option => <button key={option.id} type="button" className="photo-pose" aria-pressed={pose === option.id} onClick={() => choosePose(option.id)}><span aria-hidden="true">{option.symbol}</span><small>{option.label}</small></button>)}
        </div>
        <div className="photo-companions" aria-label="Photo co-star">
          <button type="button" aria-pressed={companion === null} onClick={() => chooseCompanion(null)}><UserRound size={13} />Solo</button>
          <button type="button" aria-pressed={companion === 'pet'} onClick={() => chooseCompanion('pet')}><PawPrint size={13} />My pet</button>
          {RESIDENTS.map(resident => <button key={resident.id} type="button" aria-pressed={companion === resident.id} onClick={() => chooseCompanion(resident.id)}><span className="resident-dot" style={{ background: resident.color }} />{resident.name}</button>)}
        </div>
        <div className="photo-camera-actions">
          <button className="photo-library-button" type="button" onClick={() => openView('album')}><Image size={19} /><span>Album · {social.photos.length}</span></button>
          <button className="photo-shutter" type="button" onClick={shoot}><Camera size={20} />Take photo</button>
          <button className="photo-library-button" type="button" onClick={() => openView('feed')}><Sparkles size={19} /><span>DreamFeed</span></button>
        </div>
        <p className="photo-status" role="status">{status}</p>
      </Panel>
    </div>
    {view !== 'camera' ? <div className="photo-browser"><Panel title={view === 'album' ? 'Your photo album' : 'DreamFeed'} subtitle="Fictional friends · offline play · photos stay on this device" onClose={() => { setView('camera'); setSelectedId(null); }}>
      <div className="photo-browser-nav" role="tablist" aria-label="Photo collection"><button type="button" role="tab" aria-selected={view === 'album'} onClick={() => openView('album')}><Image size={15} />Album <span>{social.photos.length}/{MAX_PHOTOS}</span></button><button type="button" role="tab" aria-selected={view === 'feed'} onClick={() => openView('feed')}><Sparkles size={15} />DreamFeed</button><span className="photo-follower-count"><Users size={14} />{social.followers}</span></div>
      <p className="photo-status photo-status-browser" role="status">{status}</p>
      {selected ? <article className="photo-detail">
        <div className="photo-detail-heading"><strong>Your moment</strong><button type="button" aria-label="Back to album" onClick={() => setSelectedId(null)}><X size={18} /></button></div>
        <img className="photo-detail-image" src={selected.image} alt={`${selected.pose} pose at ${selected.zone}${selected.companionName ? ` with ${selected.companionName}` : ''}`} />
        <div className="photo-tags"><span>{selected.zone}</span><span>{selected.pose}</span>{selected.companionName ? <span>@{selected.companionName}</span> : <span>Solo moment</span>}</div>
        <label className="photo-caption-label">Write your caption<input maxLength={180} value={selected.caption} onChange={event => { const next = captionPhoto(social, selected.id, event.target.value); setSocial(next); }} onBlur={() => commit(social, 'Caption saved.')} /></label>
        <div className="photo-detail-actions"><button type="button" className="photo-publish" disabled={!!selected.post} onClick={() => publish(selected)}>{selected.post ? <Check size={17} /> : <Send size={17} />}{selected.post ? 'Shared on DreamFeed' : 'Share on DreamFeed'}</button><button type="button" className="photo-delete" aria-label="Delete photo" onClick={() => { commit(deletePhoto(social, selected.id), 'Photo deleted.'); setSelectedId(null); }}><Trash2 size={18} /></button></div>
        <p className="photo-storage-note">Your latest {MAX_PHOTOS} photos are kept. A fresh look, pose, place or co-star brings new followers.</p>
      </article> : view === 'album' ? <>
        {social.photos.length ? <div className="photo-album-grid">{social.photos.map(photo => <button type="button" key={photo.id} onClick={() => setSelectedId(photo.id)} aria-label={`View photo at ${photo.zone}${photo.companionName ? ` with ${photo.companionName}` : ''}`}><img src={photo.image} alt={`${photo.pose} at ${photo.zone}`} />{photo.post ? <span className="photo-shared-mark"><Check size={11} /></span> : null}<span className="photo-thumbnail-place">{photo.zone}</span></button>)}</div> : <div className="photo-empty"><Camera size={35} /><strong>Your first memory is waiting.</strong><p>Choose a pose and a co-star, then take a photo.</p><button type="button" onClick={() => setView('camera')}>Open camera</button></div>}
        <p className="photo-storage-note">The newest {MAX_PHOTOS} memories stay in your album. Tap a photo to add a caption, share it or delete it.</p>
      </> : <div className="dream-feed">
        {!social.photos.some(photo => photo.post) ? <div className="photo-empty"><Sparkles size={35} /><strong>Your DreamFeed starts with you.</strong><p>Share a photo from your album to meet your fictional fans and earn followers.</p><button type="button" onClick={() => openView('album')}>Choose a photo</button></div> : null}
        {social.photos.filter(photo => photo.post).map(photo => <article key={photo.id} className="dream-post">
          <header><span className="dream-avatar"><Sparkles size={17} /></span><div><strong>You <span>in Dreamland</span></strong><small>{photo.zone}{photo.companionName ? ` · with ${photo.companionName}` : ''}</small></div><button type="button" aria-label="View photo options" onClick={() => setSelectedId(photo.id)}><Image size={18} /></button></header>
          <img className="dream-post-image" src={photo.image} alt={`${photo.pose} pose at ${photo.zone}${photo.companionName ? ` with ${photo.companionName}` : ''}`} />
          <div className="dream-post-body"><div className="dream-post-stats"><button type="button" aria-label={photo.post!.liked ? 'Unlike photo' : 'Like photo'} aria-pressed={photo.post!.liked} onClick={() => commit(togglePhotoLike(social, photo.id), 'A little love for your moment.')}><Heart size={20} fill={photo.post!.liked ? 'currentColor' : 'none'} />{photo.post!.likes} likes</button><span><MessageCircle size={16} />{photo.post!.comments.length} comments</span></div><p className="dream-caption"><strong>You</strong> {photo.caption}</p>{photo.companionName ? <p className="dream-tag">@{photo.companionName}</p> : null}<div className="dream-comments">{photo.post!.comments.map((comment, index) => <p key={index}><strong>{comment.name}</strong> {comment.text}</p>)}</div></div>
        </article>)}
      </div>}
    </Panel></div> : null}
  </>;
}
