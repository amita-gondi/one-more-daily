const pad=n=>String(n).padStart(2,'0');
const stamp=date=>date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
const text=value=>value.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
export function reminderCalendar(gameUrl,time='07:00',now=new Date()) {
  const url=new URL(gameUrl);
  if(!['http:','https:'].includes(url.protocol))throw Error('Invalid game address');
  if(!/^(0[6-9]|1\d|2[0-3]):[0-5]\d$/.test(time))throw Error('Choose a time at or after 6 a.m. Pacific.');
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
  const day=new Date(Date.UTC(+p.year,+p.month-1,+p.day));
  if(`${p.hour}:${p.minute}`>=time)day.setUTCDate(day.getUTCDate()+1);
  const date=day.toISOString().slice(0,10).replace(/-/g,'');
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//One More//Daily Reminder//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH',
    'BEGIN:VTIMEZONE','TZID:America/Los_Angeles','X-LIC-LOCATION:America/Los_Angeles',
    'BEGIN:DAYLIGHT','DTSTART:19700308T020000','RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU','TZOFFSETFROM:-0800','TZOFFSETTO:-0700','TZNAME:PDT','END:DAYLIGHT',
    'BEGIN:STANDARD','DTSTART:19701101T020000','RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU','TZOFFSETFROM:-0700','TZOFFSETTO:-0800','TZNAME:PST','END:STANDARD','END:VTIMEZONE',
    'BEGIN:VEVENT',`UID:one-more-daily-${time.replace(':','')}@${url.hostname}`,`DTSTAMP:${stamp(now)}`,`DTSTART;TZID=America/Los_Angeles:${date}T${time.replace(':','')}00`,'DURATION:PT5M','RRULE:FREQ=DAILY',
    'SUMMARY:Play One More',`DESCRIPTION:${text('Your daily word puzzles are ready.\n'+url.href)}`,`URL:${url.href}`,'TRANSP:TRANSPARENT','STATUS:CONFIRMED',
    'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:Your One More words are ready.','TRIGGER:PT0S','END:VALARM','END:VEVENT','END:VCALENDAR'];
  const encoder=new TextEncoder();
  return lines.map(line=>{const parts=[];let part='';for(const c of line){if(encoder.encode(part+c).length>75){parts.push(part);part=' '+c;}else part+=c;}parts.push(part);return parts.join('\r\n');}).join('\r\n')+'\r\n';
}
export function initReminders({modal,toast}) {
  document.querySelector('#daily-reminder').onclick=()=>{
    modal('<h2>Daily reminder</h2><p>Add a daily event to your calendar with a link back to the game.</p><form id="reminder-form"><label class="reminder-label" for="reminder-time">Reminder time · Pacific</label><input id="reminder-time" class="reminder-time" type="time" min="06:00" value="07:00" required><div class="modal-actions"><button class="primary-button" type="submit">Get calendar reminder</button></div></form><p>Open the downloaded file in your calendar, save the event, and keep its alert enabled. Your calendar sends the reminder.</p>');
    document.querySelector('#reminder-form').onsubmit=e=>{
      e.preventDefault();const value=document.querySelector('#reminder-time').value;
      let data;try{data=reminderCalendar(location.origin+location.pathname,value);}catch(error){toast(error.message);return;}
      const link=document.createElement('a');const objectUrl=URL.createObjectURL(new Blob([data],{type:'text/calendar;charset=utf-8'}));
      link.href=objectUrl;link.download='one-more-daily-reminder.ics';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),30000);
      toast('Open the calendar file to finish setting up your reminder.');
    };
  };
}
