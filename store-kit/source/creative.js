// Marketing presentation around the unmodified production preview; no simulated extension APIs.
const mode=new URLSearchParams(location.search).get('mode')||'overview';
const canvas=document.getElementById('canvas');
if(['small','marquee','privacy'].includes(mode))canvas.classList.add(mode);
if(mode==='privacy'){
 document.getElementById('eyebrow').textContent='השליטה נשארת אצלך';
 document.getElementById('headline').innerHTML='הטקסט שלך.<br>בשליטה שלך.';
 document.getElementById('description').innerHTML='זיהוי דיבור מקומי.<br>העתקה, הורדה ושחזור — לבחירתך.';
 document.getElementById('tags').innerHTML='<span>הורדת טקסט</span><span>טיוטה מקומית לבחירה</span>';
 document.getElementById('footnote').textContent='השמע אינו נשמר או נשלח לשרת על ידי התוסף';
}
if(mode==='small'||mode==='marquee')document.getElementById('product').remove();
if(mode==='marquee'){
 document.getElementById('headline').textContent='הקול שלך. המכשיר שלך.';
 document.getElementById('description').textContent='תמלול בעברית. מקומי. גם ללא אינטרנט.';
}
