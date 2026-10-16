/* Local interface translations. Technical/browser errors may retain their original wording. */
(function(root){
  const he={
    'Interface language':'שפת ממשק','Audio recording':'הקלטת שמע','Incoming audio level':'עוצמת השמע הנכנס','Audio transcription progress':'התקדמות התמלול',
    'Your voice. Your device.':'הקול שלך. המכשיר שלך.',
    'On-device recognition':'זיהוי דיבור מקומי','Works offline':'פועל ללא אינטרנט',
    'Audio source':'מקור שמע','Microphone':'מיקרופון','Browser tab audio':'שמע מלשונית',
    'Your voice. For YouTube, choose Browser tab audio.':'להקלטת הקול שלך. לתמלול YouTube בחרו שמע מלשונית.',
    'Select the YouTube tab, enable Share tab audio, then click Share.':'בחרו בלשונית YouTube, הפעילו שיתוף שמע ולחצו על שיתוף.',
    'READY WHEN YOU ARE':'מוכנים להתחיל','GETTING READY':'מתכוננים','LISTENING TO TAB':'מקשיבים ללשונית','LISTENING TO MICROPHONE':'מקשיבים למיקרופון',
    'MICROPHONE SETUP':'הגדרת מיקרופון','CHOOSING A TAB':'בחירת לשונית','OPENING MICROPHONE':'פותחים מיקרופון','FINISHING UP':'מסיימים','TRANSCRIBING AUDIO':'מתמללים שמע','NEEDS ATTENTION':'נדרשת פעולה',
    'Choose tab & transcribe':'בחירת לשונית ותמלול','Enable microphone':'הפעלת מיקרופון','Start recording':'התחלת הקלטה','Stop recording':'עצירת הקלטה','Stop transcription':'עצירת תמלול',
    'Loading model…':'טוענים מודל…','Waiting for permission…':'ממתינים להרשאה…','Opening tab audio…':'פותחים שמע מלשונית…','Opening microphone…':'פותחים מיקרופון…','Finishing…':'מסיימים…','Reload speech engine':'טעינת המנוע מחדש',
    'Choose an audio file':'בחירת קובץ שמע','Try a sample':'ניסיון עם דוגמה','Transcript':'תמלול','Clear':'ניקוי','Copy text':'העתקת טקסט','Insert into page':'הוספה לדף','Insert into page ↗':'הוספה לדף ↗',
    'Download TXT':'הורדת טקסט','Download SRT':'הורדת SRT','Download VTT':'הורדת VTT','Undo insertion':'ביטול ההוספה',
    'Captions use recognition timing. Review them before publishing; editing the transcript clears caption timing.':'תזמון הכתוביות מבוסס על הזיהוי. בדקו לפני פרסום; עריכת התמלול מוחקת את התזמון.',
    'Cancel insertion':'ביטול הוספה','Choosing a destination…':'בוחרים יעד…','Website access needed':'נדרשת הרשאת אתר','Choose a text field…':'בחרו שדה טקסט…',
    'Website address':'כתובת האתר','Allow & insert':'אישור והוספה','Allow insertion on all HTTP/HTTPS websites':'אישור הוספה לכל אתרי HTTP/HTTPS',
    'Chrome needs access to the destination website. Allow one site below, or explicitly enable all websites.':'נדרשת הרשאה לאתר היעד. אפשר לאשר אתר אחד, או לבחור במפורש בכל האתרים.',
    'Click Insert, then choose a visible field. Text is shared with that website only when you place it. Never inserts into passwords or submits forms.':'לחצו על הוספה ובחרו שדה גלוי. הטקסט יועבר לאתר רק לאחר הבחירה. אין הוספה לסיסמאות או שליחת טפסים.',
    'Privacy & recovery':'פרטיות ושחזור','Keep a local recovery draft for up to 7 days':'שמירת טיוטה מקומית לשחזור עד 7 ימים',
    'Off by default. No audio is saved. Drafts stay in this Chrome profile, never Chrome Sync.':'כבוי כברירת מחדל. שמע אינו נשמר. הטיוטה נשארת בפרופיל Chrome הזה ואינה מסתנכרנת.',
    'Delete saved draft':'מחיקת הטיוטה השמורה','Revoke saved website access':'ביטול הרשאות אתרים שמורות',
    'Download your text before closing this panel. Recovery is off.':'הורידו את הטקסט לפני סגירת החלונית. השחזור כבוי.',
    'Recovery is on. One local draft expires after 7 days. No audio is saved.':'השחזור פעיל. טיוטה מקומית אחת נמחקת לאחר 7 ימים. שמע אינו נשמר.',
    'Privacy policy':'מדיניות פרטיות','Source & support':'קוד מקור ותמיכה','Recognition stays on this device. No account. No cloud.':'הזיהוי נשאר במכשיר. ללא חשבון וללא ענן.',
    'About this extension':'על התוסף','Credits, licenses & privacy':'קרדיטים, רישיונות ופרטיות',
    'Audio is never saved or uploaded. Transcript recovery is optional and stays in this Chrome profile for up to 7 days.':'שמע אינו נשמר או מועלה. שחזור תמלול הוא אופציונלי ומקומי, עד 7 ימים.',
    'English recognition is limited. Please check names and numbers.':'הזיהוי באנגלית מוגבל. בדקו שמות ומספרים.',
    'Speak Hebrew. Your audio stays right here.':'דברו בעברית. השמע נשאר במכשיר.',
    'Speak Hebrew into your microphone.':'דברו בעברית למיקרופון.',
    'Transcribe Hebrew from YouTube, podcasts, or another browser tab.':'תמלול עברית מ־YouTube, מפודקאסטים או מלשונית אחרת.',
    'Listening to your selected tab in Hebrew. Keep the video playing.':'מקשיבים לעברית בלשונית שנבחרה. השאירו את הסרטון פועל.',
    'Listening to your microphone in Hebrew. Press Stop when you’re done.':'מקשיבים לעברית במיקרופון. לחצו על עצירה לסיום.',
    'No tab audio detected. Play the video and check its volume.':'לא זוהה שמע בלשונית. הפעילו את הסרטון ובדקו את עוצמת הקול.',
    'No microphone audio detected. To transcribe YouTube, choose Browser tab as the audio source.':'לא זוהה שמע במיקרופון. לתמלול YouTube בחרו שמע מלשונית.',
    'Starting the local speech engine…':'מפעילים את מנוע הדיבור המקומי…','Loading the bundled Hebrew model…':'טוענים את המודל העברי המצורף…','Preparing Hebrew recognition…':'מכינים זיהוי דיבור בעברית…',
    'Opening your audio file locally…':'פותחים את קובץ השמע במכשיר…','Opening the bundled Hebrew sample…':'פותחים את הדוגמה בעברית…',
    'Transcribing your file locally at playback speed to keep memory bounded.':'מתמללים מקומית במהירות הנגינה כדי להגביל שימוש בזיכרון.',
    'Finishing the last words…':'משלימים את המילים האחרונות…','Ready to try again.':'אפשר לנסות שוב.',
    'All done. Edit, copy, or insert your text.':'הסתיים. אפשר לערוך, להעתיק או להוסיף את הטקסט.',
    'The local speech engine needs to restart.':'נדרשת הפעלה מחדש של מנוע הדיבור.',
    'Copied. Paste it wherever you need it.':'הועתק. אפשר להדביק במקום הרצוי.',
    'Recovered your local draft.':'הטיוטה המקומית שוחזרה.','Saved draft deleted. The current transcript is still here.':'הטיוטה השמורה נמחקה. התמלול הנוכחי עדיין כאן.',
    'Insertion undone.':'ההוספה בוטלה.','Text inserted. You can keep dictating or copy it elsewhere.':'הטקסט נוסף. אפשר להמשיך להכתיב או להעתיק למקום אחר.',
    'Click a visible text field on the webpage. Escape cancels. Enter inserts into a focused field without submitting.':'בחרו שדה גלוי בדף. Escape מבטל. Enter מוסיף לשדה שבמוקד בלי לשלוח טופס.',
    'Allow one website below, or explicitly enable all websites. Copy works without website access.':'אשרו אתר אחד למטה, או בחרו במפורש בכל האתרים. העתקה אינה דורשת הרשאת אתר.',
    'Insertion cancelled. Your transcript is still here.':'ההוספה בוטלה. התמלול עדיין כאן.',
    'Checking microphone access…':'בודקים הרשאת מיקרופון…','Allow microphone access when Chrome asks.':'אשרו שימוש במיקרופון כש־Chrome מבקש.',
    'Set up microphone access':'הגדרת הרשאת מיקרופון','Cancel microphone setup':'ביטול הגדרת מיקרופון',
    'Choose Allow in the setup window. Recording will start here afterwards.':'בחרו אישור בחלון ההגדרה. ההקלטה תתחיל כאן לאחר מכן.',
    'Browser preview: recording, files, and recognition run locally. Page insertion is available when installed as an extension.':'תצוגה מקדימה: הזיהוי פועל במכשיר. הוספה לדפים זמינה לאחר התקנת התוסף.',
    'Choose the Chrome tab playing your video and turn on Share tab audio.':'בחרו את לשונית הסרטון ב־Chrome והפעילו שיתוף שמע מהלשונית.',
    'Transcription cancelled. Your text is still here.':'התמלול בוטל. הטקסט עדיין כאן.'
  };
  let language='en';try{language=localStorage.getItem('ui-language')==='he'?'he':'en';}catch{}
  const reverse=new Map(Object.entries(he).map(([en,value])=>[value,en]));
  function t(text){return language==='he'?(he[text]||text):(reverse.get(text)||text);}
  function apply(){
    if(!root.document?.createTreeWalker)return;
    document.documentElement.lang=language;document.documentElement.dir=language==='he'?'rtl':'ltr';
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
    while((node=walker.nextNode())){
      if(['SCRIPT','STYLE'].includes(node.parentElement?.tagName))continue;
      const value=node.nodeValue.trim();const translated=t(value);
      if(translated!==value)node.nodeValue=node.nodeValue.replace(value,translated);
    }
    for(const element of document.querySelectorAll('[aria-label]')){const value=element.getAttribute('aria-label');element.setAttribute('aria-label',t(value));}
  }
  function setLanguage(value){language=value==='he'?'he':'en';try{localStorage.setItem('ui-language',language);}catch{}apply();}
  root.IvritI18n={get language(){return language;},t,apply,setLanguage};
})(globalThis);
