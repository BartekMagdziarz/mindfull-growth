// Original Lab-only icon geometry. C uses B contours with a tonal interior.
export type IconVariant = 'a' | 'b' | 'c'
    const p=(d: string)=>`<path d="${d}"/>`;
    const c=(x: number,y: number,r: number)=>`<circle cx="${x}" cy="${y}" r="${r}"/>`;
    export const icons=[
      {id:'journal',label:'Dziennik',a:p('M7 3.5h11a2 2 0 0 1 2 2v15H7a3 3 0 0 1-3-3v-11a3 3 0 0 1 3-3Z M7 3.5v14 M4 17.5h16 M10 8h6 M10 11.5h4'),b:p('M7 4Q12 2.5 18.5 4Q20 4.5 20 6l-.5 14Q13 18.5 7 20Q4 20 4 17V7Q4 4.5 7 4Z M7 4v16 M10.5 8q3-.8 6 0 M10.5 11.5q2-.5 4 0'),fill:p('M7 4Q12 2.5 18.5 4Q20 4.5 20 6l-.5 14Q13 18.5 7 20Z')},
      {id:'calendar',label:'Kalendarz',a:p('M7 5h10q3 0 3 3v10q0 3-3 3H7q-3 0-3-3V8q0-3 3-3Z M8 3v4 M16 3v4 M4 10h16')+c(9,14,0.6)+c(15,14,0.6)+c(9,18,0.6),b:p('M7 5q5-1 10 0q3 .5 3 3l-.5 10q-.2 2.5-3 2.5h-9q-3 0-3-3L4 8q0-2.5 3-3Z M8 3v4 M16 3v4 M4.2 10q8-1 15.7 0')+c(9,14,0.65)+c(15,14,0.65)+p('m8 17.5 1.5 1.5 3-3'),fill:p('M7 5q5-1 10 0q3 .5 3 3v2q-8-1-16 0V8q0-2.5 3-3Z')},
      {id:'goal',label:'Cel',a:c(11,13,8)+c(11,13,4)+p('m11 13 9-9 M16 4h4v4'),b:p('M17 8q-3-3.5-7-3Q3 5 3 12.5T11 21q7 0 8-7 M13.5 9.5Q7 7 7 13q0 4 4 4q4 0 4-3 M11 13l9-9 M16 4h4v4'),fill:p('M13.5 9.5Q7 7 7 13q0 4 4 4q4 0 4-3Z')},
      {id:'habit',label:'Nawyk',a:p('M4 9a8 8 0 0 1 14-3l2 2 M20 4v4h-4 M20 15a8 8 0 0 1-14 3l-2-2 M4 20v-4h4 M9 12l2 2 4-4'),b:p('M4 9Q6 2 12 3q5 0 8 5 M19 3l1 5-5-.5 M20 15q-2 7-8 6q-5 0-8-5 M5 21l-1-5 5 .5 M9 12l2 2 4-4'),fill:p('M8 10q4-2 8 0v5q-4 2-8 0Z')},
      {id:'priority',label:'Priorytet',a:p('M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z'),b:p('M12 3q1 7 8 8q-7 2-8 10q-1-7-8-9q7-2 8-9Z'),fill:p('M12 3q1 7 8 8q-7 2-8 10q-1-7-8-9q7-2 8-9Z')},
      {id:'reflection',label:'Refleksja',a:p('M20 10c0 4-3.5 7-8 7H8l-4 3v-6q-2-2-2-4c0-4 4-7 9-7s9 3 9 7Z M7 8h8 M7 11.5h5'),b:p('M21 9.5Q21 3 12 3Q3 3 3 9.5q0 3.5 3 5.5l-1 5l5-3q11 1 11-7.5Z M8 8.5q4-1 8 0 M8 12q2-.5 4 0'),fill:p('M21 9.5Q21 3 12 3Q3 3 3 9.5q0 3.5 3 5.5l-1 5l5-3q11 1 11-7.5Z')},
      {id:'emotion',label:'Emocje',a:c(12,12,9)+p('M8 9h.1 M16 9h.1 M8 14q4 4 8 0'),b:p('M21 11Q20 2 11 3Q2 4 3 13q1 9 10 8q9-1 8-10Z M8 9.5h.1 M15.5 9h.1 M8 14q4 4 8-.5'),fill:p('M5 13q7 3 14-.5q-1 7-7 7q-6 0-7-6Z')},
      {id:'relations',label:'Relacje',a:c(8,7,3)+c(17,8,2.5)+p('M2.5 20v-2a5.5 5.5 0 0 1 11 0v2 M16 14a5 5 0 0 1 5.5 5v1'),b:p('M10.5 6.5Q10 3 7 4Q4 5 5 8q1 3 4 1.5q2-1 1.5-3Z M19.5 7.5q0-3-3-2.5q-3 .5-2.5 3q.5 3 3 2.5q2.5-.5 2.5-3Z M3 20q-1-7 4-7q5 0 5 7 M13 14q6-4 8 5'),fill:p('M3 20q-1-7 4-7q5 0 5 7Z')},
      {id:'rest',label:'Odpoczynek',a:p('M19.5 15A8.5 8.5 0 0 1 9 4a8.5 8.5 0 1 0 10.5 11Z M17 3v4 M15 5h4'),b:p('M9 3.5Q5 12 12 15q3 1 7-.5Q17 22 9 20Q1 18 3 10q1-4 6-6.5Z M17 3q0 3 3 3q-3 0-3 3q0-3-3-3q3 0 3-3Z'),fill:p('M9 3.5Q5 12 12 15q3 1 7-.5Q17 22 9 20Q1 18 3 10q1-4 6-6.5Z')},
      {id:'growth',label:'Rozwój',a:p('M12 21V11 M12 15Q3 15 3 6q9 0 9 9Z M12 11q0-8 9-8q0 8-9 8Z'),b:p('M11 21q2-8 1-11 M12 15Q2 16 3 6q9-1 9 9Z M12 11Q11 2 21 3q0 9-9 8Z'),fill:p('M12 11Q11 2 21 3q0 9-9 8Z')},
      {id:'edit',label:'Edycja',a:p('m4 15 11-11q1-1 2 0l3 3q1 1 0 2L9 20l-6 1Z M13 6l5 5 M4 15l5 5'),b:p('M4 15 15 4q1.5-1.5 3 0l2 2q1.5 1.5 0 3L9 20l-6 1Z M13.5 5.5l5 5 M4 15q3 1 5 5'),fill:p('M4 15q3 1 5 5l-6 1Z')},
      {id:'filter',label:'Filtr',a:p('M4 6h4 M12 6h8 M4 12h10 M18 12h2 M4 18h2 M10 18h10')+c(10,6,2)+c(16,12,2)+c(8,18,2),b:p('M4 6q2-.3 4 0 M12 6q4 .5 8 0 M4 12q5-.5 10 0 M18 12h2 M4 18h2 M10 18q5 .5 10 0')+c(10,6,2)+c(16,12,2)+c(8,18,2),fill:c(10,6,2)+c(16,12,2)+c(8,18,2)}
    ];
    export const variants=[{id:'a',name:'Miękki kontur',sub:'Geometria · porządek'},{id:'b',name:'Organiczny kontur',sub:'Krzywizny · osobowość'},{id:'c',name:'Kontur + ton',sub:'Organiczny · wypełnienie'}];

export function iconMarkup(id: string, variant: IconVariant) {
  const icon = icons.find(icon => icon.id === id) ?? icons[0]
  return (variant === 'c' ? `<g fill="currentColor" fill-opacity=".16" stroke="none">${icon.fill}</g>` : '') + (variant === 'a' ? icon.a : icon.b)
}
