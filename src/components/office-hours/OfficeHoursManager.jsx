'use client';
import React from 'react';
import { Clock, Users2, MapPin, Plus, Play, Pause, Video } from 'lucide-react';
import { ApiClientError, apiRequest } from '@/lib/api/client';
import { cn } from '@/lib/utils';
const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const modeIcons = {
    IN_PERSON: MapPin,
    VIRTUAL: Video,
    HYBRID: Users2,
};
const modeColors = {
    IN_PERSON: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    VIRTUAL: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    HYBRID: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
};
function formatTo12Hour(time24) {
    const [hoursRaw, minutes] = time24.split(':').map(Number);
    const isPm = hoursRaw >= 12;
    const hours = hoursRaw % 12 || 12;
    return `${hours}:${String(minutes).padStart(2, '0')} ${isPm ? 'PM' : 'AM'}`;
}
export function OfficeHoursManager() {
    const [slots, setSlots] = React.useState([]);
    const [selectedSlot, setSelectedSlot] = React.useState(null);
    const [loadingSlots, setLoadingSlots] = React.useState(true);
    const [error, setError] = React.useState(null);
    const loadSlots = React.useCallback(async () => {
        setLoadingSlots(true);
        setError(null);
        try {
            const data = await apiRequest('/api/office-hours');
            setSlots(data);
            if (data.length > 0) {
                setSelectedSlot((previous) => previous ?? data[0].id);
            }
        }
        catch (err) {
            const message = err instanceof ApiClientError ? err.message : 'Unable to load office hour slots';
            setError(message);
            setSlots([]);
        }
        finally {
            setLoadingSlots(false);
        }
    }, []);
    React.useEffect(() => {
        void loadSlots();
    }, [loadSlots]);
    const toggleActive = async (slotId) => {
        setError(null);
        try {
            const updated = await apiRequest(`/api/office-hours/${slotId}/toggle`, {
                method: 'PATCH',
            });
            setSlots((previous) => previous.map((slot) => (slot.id === slotId ? updated : slot)));
            if (updated.isActive) {
                setSelectedSlot(updated.id);
            }
        }
        catch (err) {
            const message = err instanceof ApiClientError ? err.message : 'Unable to toggle office hour slot';
            setError(message);
        }
    };
    return (<div className="space-y-6">
      {error && (<p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </p>)}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loadingSlots && <p className="text-sm text-muted-foreground">Loading office hour slots...</p>}

        {!loadingSlots && slots.map((slot) => {
            const ModeIcon = modeIcons[slot.mode];
            return (<div key={slot.id} onClick={() => setSelectedSlot(slot.id)} className={cn('rounded-2xl border bg-card p-5 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5', selectedSlot === slot.id ? 'border-primary shadow-lg shadow-primary/10' : 'border-border/60')}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', modeColors[slot.mode])}>
                    <ModeIcon className="w-4 h-4"/>
                  </div>
                  <span className={cn('pill-btn text-[10px] font-bold', modeColors[slot.mode])}>{slot.mode.replace('_', ' ')}</span>
                </div>
                <button onClick={(event) => {
                    event.stopPropagation();
                    void toggleActive(slot.id);
                }} className={cn('p-1.5 rounded-lg transition-all', slot.isActive ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                  {slot.isActive ? <Play className="w-3.5 h-3.5"/> : <Pause className="w-3.5 h-3.5"/>}
                </button>
              </div>

              <h3 className="font-display font-bold text-sm">{weekdayNames[slot.dayOfWeek]}</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Clock className="w-3 h-3"/>{formatTo12Hour(slot.startTime)} - {formatTo12Hour(slot.endTime)}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3"/>{slot.location}</p>
            </div>);
        })}

        {!loadingSlots && (<div className="rounded-2xl border-2 border-dashed border-border/60 p-5 flex flex-col items-center justify-center gap-2 text-muted-foreground min-h-[140px]">
            <Plus className="w-6 h-6"/>
            <span className="text-sm font-semibold">Create slot via API (UI form pending)</span>
          </div>)}
      </div>
    </div>);
}
