"use strict";
/* Schloss Krummfels – kleines, eigenständiges Fantasy-Point-and-Click-Adventure.
   Keine externen Laufzeitbibliotheken oder Grafikdateien erforderlich. */
(() => {
const $ = id => document.getElementById(id);
const canvas = $("world");
const g = canvas.getContext("2d", {alpha:false});
if(!g){$("line").textContent="Dein Browser unterstützt leider kein Canvas.";return;}
g.imageSmoothingEnabled = false;
const KEY="krummfels-save-1";
const items={
  bread:{name:"Steinhartes Brot",symbol:"▰",text:"Malves Brot. Ein hungriger Rabe könnte sich daran einen Schnabel abbrechen."},
  wedge:{name:"Holzkeil",symbol:"◭",text:"Ein Holzkeil, wahrscheinlich vor Jahrzehnten als hochmoderne Reparatur erfunden."},
  pebble:{name:"Hübscher Stein",symbol:"◆",text:"Ein Kieselstein. Vollkommen nutzlos. Jedenfalls bisher."},
  crest:{name:"Knopf mit Drachenwappen",symbol:"✥",text:"Ein alter Knopf mit dem Zeichen eines Drachen. Jorin hat ständig solche Zeichen gezeichnet."},
  spoon:{name:"Verbogener Löffel",symbol:"♧",text:"Ein sehr verbogener Löffel. Der Griff wurde offenbar als Brecheisen missbraucht."},
  bell:{name:"Silberne Tischglocke",symbol:"♬",text:"Malves Glocke. Klirrend, silbern und vermutlich stärker bewacht als die Staatskasse."},
  soup:{name:"Krönungssuppe",symbol:"♨",text:"Ein enorm schwerer Suppentopf. Die Tasche hat sich beim Einpacken laut beschwert."},
  napkin:{name:"Bestickte Serviette",symbol:"▧",text:"Prunkvolle Stickerei, darunter ein Loch von der Größe eines Suppenlöffels."},
  memo:{name:"Eberhards Randnotiz",symbol:"▤",text:"Jorin – Westflügel – Drachenzeichen – altes Archiv. Endlich eine echte Spur."}
};
const sceneDefs={
  yard:{name:"BURGHOF · ZWISCHEN RUHM UND MAUERFRAß",spots:[
    ["kitchenDoor","Tür zur Schlossküche",25,96,84,117],
    ["baldrian","Magister Baldrian",279,70,43,71],
    ["west","Verfallener Westflügel",239,101,106,101],
    ["raven","Korbinian, der Rabe",185,107,44,47],
    ["bell","Herabgefallene Glocke",229,176,30,24],
    ["well","Alter Brunnen",167,138,107,80],
    ["wedge","Holzkeil unter der Bank",85,219,47,27],
    ["pebble","Kieselstein",287,238,32,23],
    ["crest","Knopf im Mauerstaub",323,221,27,21],
    ["balduin","Sir Balduin",392,139,39,77],
    ["hallDoor","Tor zum großen Saal",355,91,106,131]
  ]},
  kitchen:{name:"SCHLOSSKÜCHE · HERRSCHAFT DER SUPPE",spots:[
    ["yardDoor","Zurück in den Burghof",8,83,72,127],
    ["shelf","Küchenregal",112,62,114,76],
    ["bread","Steinhartes Brot",161,167,67,31],
    ["spoon","Verbogener Löffel",224,177,30,25],
    ["pot","Königlicher Suppentopf",270,142,64,62],
    ["malve","Mutter Malve",341,87,77,128]
  ]},
  hall:{name:"GROSSER SAAL · PRUNK MIT HAARRISSEN",spots:[
    ["hallExit","Zurück in den Burghof",9,95,67,124],
    ["tapestry","Herrschaftlicher Wandteppich",62,45,110,122],
    ["throne","Königlicher Thron",174,71,90,128],
    ["lectern","Wackeliges Rednerpult",271,147,71,77],
    ["memo","Versteckte Randnotiz",287,221,39,22],
    ["eberhard","Hofmeister von Zwirn",351,111,52,104],
    ["napkin","Bestickte Serviette",405,213,46,24],
    ["archive","Verschlossenes Archiv",428,55,49,154]
  ]}
};
const descriptions={
 kitchenDoor:"Aus der Küche zieht ein Duft herüber. Es könnte Eintopf sein. Oder ein Unfall.",
 baldrian:"Magister Baldrian, Hofzauberer. Seine Robe hat mehr Flecken als Sterne.",
 west:"Hier beginnt der Westflügel. Seit Jahren abgesperrt. Den Steinen scheint das nicht mitgeteilt worden zu sein.",
 raven:"Korbinian hält sich für die klügste Kreatur im Königreich. Die Konkurrenz ist überschaubar.",
 well:"Ein alter Brunnen. Korbinian hockt darüber und hat etwas Silbernes unter seinen Flügeln.",
 bell:"Malves silberne Tischglocke! Sie ist dem Raben aus den Krallen gefallen.",
 wedge:"Ein kleiner Holzkeil klemmt unter einer morsch gewordenen Bank.",
 pebble:"Ein auffällig unauffälliger Stein. Fenna beschließt, ihn interessant zu finden.",
 crest:"Zwischen den Steinen liegt ein Messingknopf mit einem Drachen als Wappen.",
 balduin:"Sir Balduin von Blech, Hauptmann der Schlosswache. Sein Helm ist das Einzige hier ohne Risse.",
 hallDoor:"Zum großen Saal. Ein Schild verspricht: »Zutritt nur für Berechtigte, Adel und Suppe.«",
 yardDoor:"Die Küchentür führt zum Burghof. Vielleicht ist es dort wenigstens weniger heiß.",
 shelf:"Das Küchenregal ist nach einer strengen Ordnung sortiert, die offenbar nur Malve versteht.",
 bread:"Malve hat dieses Brot von gestern sicherheitshalber als Türstopper aufgehoben.",
 spoon:"Dieser Löffel hat schon bessere Suppen gesehen.",
 pot:"Das Staatsbankett besteht heute überwiegend aus Krönungssuppe. Sie riecht verdächtig gut.",
 malve:"Mutter Malve regiert die Küche. Der König regiert nur das übrige Schloss, behauptet er.",
 hallExit:"Die Tür zum Burghof. Der Hauptmann steht auf der anderen Seite und denkt vermutlich über Dienstvorschriften nach.",
 tapestry:"Ein prächtiger Teppich verdeckt einen Riss in der Wand. Wahrscheinlich ist der Riss inzwischen größer als der Teppich.",
 throne:"Ein vergoldeter Thron. Auf dem Polster klebt ein Zettel: »Bitte nicht auf der losen Stelle sitzen.«",
 lectern:"Das Rednerpult steht gefährlich schief. Irgendetwas fehlt unter einem Bein.",
 memo:"Ein gefaltetes Pergament steckt zwischen den Füßen des Rednerpults.",
 eberhard:"Eberhard von Zwirn, Hofmeister. Spricht lieber über Zeremonien als über fehlende Kronen.",
 napkin:"Die königlichen Servietten tragen das Wappen des Hauses Krummfels. Einige tragen zusätzlich Flecken.",
 archive:"Zum alten Archiv. Das Schloss hält diesen Flügel geschlossen, angeblich wegen »ausgeprägter Staubentwicklung«."
};
const flagsTemplate={
 introSeen:false,breadTaken:false,wedgeTaken:false,pebbleTaken:false,crestTaken:false,spoonTaken:false,
 bellDropped:false,bellTaken:false,soupTaken:false,hallOpen:false,lecternFixed:false,memoTaken:false,
 napkinTaken:false,eberhardTold:false,completed:false
};
const initial=()=>({room:"yard",verb:"look",item:null,inv:[],flags:{...flagsTemplate},
  said:"Ein Schloss voller Geheimnisse. Und irgendwo hier hat Jorin seine letzte Spur hinterlassen.",who:"FENNA"});
let s=initial();
try {
 const saved=JSON.parse(localStorage.getItem(KEY)||"null");
 if(saved && sceneDefs[saved.room] && saved.flags && Array.isArray(saved.inv)){
   s={...initial(),...saved,flags:{...flagsTemplate,...saved.flags},
     inv:saved.inv.filter(id=>Object.hasOwn(items,id)),item:null,verb:"look"};
 }
} catch(e){/* Ohne Speicher funktioniert das Spiel weiter. */}
let hovering=null,talking=false,showEnd=false;
function persist(){try{localStorage.setItem(KEY,JSON.stringify(s));}catch(e){/* optional */}}
function line(who,phrase){s.who=who;s.said=phrase;$("speaker").textContent=who;$("line").textContent=phrase;persist();}
function fenna(t){line("FENNA",t);}
function has(id){return s.inv.includes(id);}
function add(id){if(!has(id))s.inv.push(id);drawInv();persist();}
function remove(id){s.inv=s.inv.filter(x=>x!==id);if(s.item===id)s.item=null;drawInv();persist();}
function stage(){
 const f=s.flags;
 const n=[f.bellDropped,f.soupTaken,f.hallOpen,f.lecternFixed,f.completed].filter(Boolean).length;
 $("progress").textContent="FORTSCHRITT · "+n+"/5";
 $("sceneTitle").textContent=sceneDefs[s.room].name;
 $("objective").textContent=f.completed?"Du hast die Spur zu Jorin entdeckt. Das Archiv und der Westflügel warten auf das nächste Kapitel.":
 !f.bellDropped?"Finde heraus, warum Korbinian die Tischglocke nicht herausgeben will.":
 !f.soupTaken?"Bring Mutter Malve ihre Tischglocke zurück.":
 !f.hallOpen?"Überzeuge Sir Balduin, dich in den großen Saal zu lassen.":
 !f.lecternFixed?"Hilf dem Hofmeister mit seinem wackeligen Rednerpult.":
 !f.memoTaken?"Am Pult ist jetzt etwas zu entdecken.":
 "Frage Eberhard nach Jorin und der Randnotiz.";
 for(const b of $("rooms").querySelectorAll("button")){b.classList.toggle("selected",b.dataset.room===s.room);b.setAttribute("aria-current",b.dataset.room===s.room?"location":"false");}
 renderSpots();drawInv();persist();
}
function setVerb(v){s.verb=v;s.item=null;drawInv();document.querySelectorAll("[data-verb]").forEach(b=>{const sel=b.dataset.verb===v;b.classList.toggle("selected",sel);b.setAttribute("aria-pressed",String(sel));});persist();}
function drawInv(){
 const box=$("inventory");box.replaceChildren();
 if(!s.inv.length){const e=document.createElement("span");e.className="empty-bag";e.textContent="Noch leer. Die Tasche findet das enttäuschend.";box.append(e);}
 for(const id of s.inv){const b=document.createElement("button");b.type="button";b.textContent=items[id].symbol+" "+items[id].name;
  const sel=s.item===id;b.classList.toggle("selected",sel);b.setAttribute("aria-pressed",String(sel));
  b.title=items[id].text;b.addEventListener("click",()=>selectItem(id));box.append(b);
 }
 $("actionHint").textContent=s.item?"Ausgewählt: "+items[s.item].name+". Klicke auf ein Ziel in der Szene oder einen anderen Gegenstand.":
 "Aktion: "+({look:"Ansehen",take:"Nehmen",use:"Benutzen",talk:"Reden"}[s.verb])+". Klicke im Bild oder auf einen Ort darunter.";
}
function selectItem(id){
 if(s.verb==="look" && !s.item){fenna(items[id].text);return;}
 if(s.item===id){s.item=null;drawInv();return;}
 if(s.item && s.item!==id){fenna("Diese beiden Dinge zusammen ergeben vermutlich nur eine neue Art von Unordnung. Eine beeindruckende Leistung.");s.item=null;drawInv();return;}
 s.item=id;s.verb="use";document.querySelectorAll("[data-verb]").forEach(b=>{const selected=b.dataset.verb==="use";b.classList.toggle("selected",selected);b.setAttribute("aria-pressed",String(selected));});drawInv();
}
function navigate(room){
 if(room==="hall"&&!s.flags.hallOpen){fenna("Sir Balduin versperrt den Eingang. Ich brauche einen guten Grund, in den Saal zu gehen. Idealerweise einen, der nach Suppe riecht.");s.room="yard";stage();return;}
 s.room=room;s.item=null;s.verb="look";setVerb("look");hovering=null;
 if(room==="yard")fenna("Der Burghof: ein Freilichtmuseum für Schäden an tragenden Wänden.");
 if(room==="kitchen")fenna("Der einzige Ort im Schloss, an dem offenbar jemand weiß, was er tut.");
 if(room==="hall")fenna("Ah, der große Saal. Hier werden Risse grundsätzlich mit Wandteppichen bekämpft.");
 stage();
}
function speak(name,text,choices){
 talking=true;
 $("talkTitle").textContent=name;$("talkBody").textContent=text;
 const box=$("talkChoices");box.replaceChildren();
 for(const choice of choices){
  const b=document.createElement("button");b.type="button";b.textContent=choice[0];
  b.addEventListener("click",()=>{closeTalk();choice[1]();});box.append(b);
 }
 $("talkModal").hidden=false;box.querySelector("button")?.focus();
}
function closeTalk(){talking=false;$("talkModal").hidden=true;canvas.focus({preventScroll:true});}
function talkWith(id){
 const f=s.flags;
 switch(id){
  case "raven": return speak("KORBINIAN, SCHLOSSRABE","»Ich bin kein gewöhnlicher Rabe. Ich bin Kulturkritiker mit Flügeln.«",[
   ["Warum hast du Malves Glocke?",()=>line("KORBINIAN","»Gestohlen? Unsinn. Ich bewahre sie vor unqualifiziertem Gebrauch.«")],
   ["Was willst du dafür?",()=>line("KORBINIAN","»Einen angemessenen kulinarischen Tribut. Aber keine Almosen direkt aus der Hand! Ich habe Standards.«")],
   ["Hast du Jorin gekannt?",()=>line("KORBINIAN","»Den Knappen mit den Drachenbüchern? Er war bemerkenswert leicht zu beeindrucken.«")],
   ["Auf Wiedersehen.",()=>fenna("Er verbeugt sich nicht. Er ist schließlich ein Rabe.")]
  ]);
  case "malve":return speak("MUTTER MALVE","»Wenn du Hunger hast, geh an den Topf. Wenn du Ärger hast, stell dich hinten an.«",[
   ["Kann ich bei der Krönung helfen?",()=>{
    if(f.soupTaken)line("MALVE","»Die Suppe hast du doch schon. Nun los, bevor sie in deiner Tasche eine eigene Regierung gründet!«");
    else if(f.bellTaken && has("bell"))line("MALVE","»Gib mir zuerst meine Tischglocke. Du musst sie dazu schon benutzen, Mädchen.«");
    else line("MALVE","»Meine Tischglocke fehlt. Der gefiederte Kunstkritiker hat sie geklaut. Ohne Glocke kein Service!«");
   }],
   ["Erinnerst du dich an Knappe Jorin?",()=>line("MALVE","»Der Junge mit dem Holzschwert? Nett war er. Hat immer nach Drachen gefragt. Zuletzt sprach er oft vom Westflügel.«")],
   ["Warum ist das Brot so hart?",()=>line("MALVE","»Es ist Spezialbrot. Für Notzeiten. Oder für einen kräftigen Einbrecher.«")],
   ["Ich bin schon weg.",()=>fenna("Malve hebt ihre Kelle. Das zählt hier als liebevoller Abschied.")]
  ]);
  case "baldrian":return speak("MAGISTER BALDRIAN","»Ich bin mitten in einem Experiment! Wenn es explodiert, war es ein Durchbruch.«",[
   ["Wegen Eurer Tasche …",()=>line("BALDRIAN","»Die Raumkrümmungstasche? Sie ist verschwunden. Sollte sie jemand besitzen: Niemals hineinrufen. Das Echo braucht Wochen.«")],
   ["Kann eine Krone kündigen?",()=>line("BALDRIAN","»Theoretisch kann jedes verzauberte Objekt kündigen. Praktisch tun sie es bevorzugt vor Feiertagen.«")],
   ["Kennt Ihr Jorin?",()=>line("BALDRIAN","»Ein Knappe, der mich nach Drachen fragte. Ich verweise auf die Geheimhaltungsklausel. Die habe ich noch nicht geschrieben.«")],
   ["Gutes Gelingen.",()=>fenna("Ich sollte ihn nicht fragen, warum es nach verbranntem Mondlicht riecht.")]
  ]);
  case "balduin":return speak("SIR BALDUIN VON BLECH","»Halt! Zugang nur für Ritter, Adelige und amtlich genehmigte Lieferungen.«",[
   ["Ich bin die neue Schlossbotin.",()=>line("BALDUIN","»Dann habt Ihr hoffentlich die vierzehnseitige Botenberechtigung dabei. In dreifacher Ausfertigung.«")],
   ["Was ist mit der Krone?",()=>line("BALDUIN","»Kronen verschwinden nicht. Sie befinden sich höchstens in strategischer Abwesenheit.«")],
   ["Ich suche meinen Bruder Jorin.",()=>line("BALDUIN","»Hier dienen viele Knappen. Der Name sagt mir nichts. Das ist eine völlig offizielle Auskunft.«")],
   ["Könnte ich einfach durch?",()=>fenna("Ein eisernes Nein. Es klingt sogar durch seinen Helm erstaunlich blechern.")]
  ]);
  case "eberhard": {
   if(f.lecternFixed && f.memoTaken){
    f.eberhardTold=true;persist();
    line("EBERHARD","»Jorin? Der Knappe? Ich erinnere mich nicht. Nun ja … er wurde nachts im Westflügel gesehen. Das steht offenbar in meinen Aufzeichnungen.«");
    if(!f.completed){f.completed=true;stage();showEnd=true;setTimeout(()=>{$("winModal").hidden=false;$("continueBtn").focus();},250);}
    return;
   }
   return speak("EBERHARD VON ZWIRN","»Ein Schloss ohne Krone ist nicht ohne Würde! Wir haben schließlich noch die Tischwäsche.«",[
    ["Was ist mit dem Rednerpult?",()=>line("EBERHARD",f.lecternFixed?"»Es steht wieder! Fast senkrecht! Mein Dank wird in der Chronik erwähnt – auf der Rückseite.«":"»Es wackelt seit 63 Jahren. Wir haben versucht, das Problem zu lösen, indem wir möglichst still davor stehen.«")],
    ["Ich suche Knappe Jorin.",()=>line("EBERHARD",f.memoTaken?"»Dieses Pergament … Wo habt Ihr das gefunden? Ach, das ist ja meine Schrift!«":"»Jorin? Unter dem Buchstaben J könnte etwas im Dienstarchiv stehen. Das Archiv ist allerdings geschlossen.«")],
    ["Hat die Krone wirklich gekündigt?",()=>line("EBERHARD","»Natürlich nicht. Eine Krone kann nicht schreiben. Allenfalls regieren. Und das auch nur auf einem Kopf.«")],
    ["Ich störe nicht länger.",()=>fenna("Der Hofmeister verneigt sich vor sich selbst. Sehr praktisch.")]
   ]);
  }
  default:fenna("Mit dem Ding kann man schlecht ein Gespräch führen. Vermutlich.");
 }
}
function take(id){
 const f=s.flags;
 const map={
 bread:["breadTaken","bread","Das Brot ist ungefähr so weich wie Sir Balduins Ansichten."],
 wedge:["wedgeTaken","wedge","Ein Holzkeil. Damit lässt sich bestimmt irgendein höfisches Problem kaschieren."],
 pebble:["pebbleTaken","pebble","Ein schöner Kieselstein. Die Tasche seufzt hörbar."],
 crest:["crestTaken","crest","Ein Drachenwappen! Jorin hatte dieses Zeichen früher ständig gezeichnet …"],
 spoon:["spoonTaken","spoon","Ein verbogener Löffel. Vielleicht kann man ihn später noch beleidigen."],
 bell:["bellTaken","bell","Erbeutet! Malves Glocke sieht ziemlich unschuldig aus."],
 napkin:["napkinTaken","napkin","Eine bestickte Serviette. Ich bin jetzt offiziell für die königliche Aussteuer zuständig."],
 memo:["memoTaken","memo","Warte … Jorin! Hier steht tatsächlich sein Name. Ich muss Eberhard darauf ansprechen."]
 };
 if(!map[id]){fenna("Das passt nicht in die Tasche. Und ich möchte auch nicht ausprobieren, was passiert, wenn es doch passt.");return;}
 if(id==="bell"&&!f.bellDropped){fenna("Die Glocke hat Korbinian noch in seinen Krallen.");return;}
 if(id==="memo"&&!f.lecternFixed){fenna("Das Pergament klemmt noch unter dem Pult.");return;}
 const [flag,item,txt]=map[id];
 if(f[flag]){fenna("Davon habe ich bereits ein Exemplar. Mehr wäre nur für einen sehr merkwürdigen Flohmarkt interessant.");return;}
 f[flag]=true;add(item);fenna(txt);stage();
}
function useItem(target){
 const id=s.item,f=s.flags;
 if(id==="bread" && target==="well" && !f.bellDropped){
  remove("bread");f.bellDropped=true;
  line("KORBINIAN","»Ein Geschenk auf dem Brunnenrand? Welch vornehme Geste!« — Dabei lässt er die Glocke fallen.");
  stage();return;
 }
 if(id==="bread" && target==="raven"){fenna("Korbinian: »Direkte Fütterung? Ich bin doch kein Huhn! Leg es standesgemäß ab.«");return;}
 if(id==="bell" && target==="malve" && !f.soupTaken){
  remove("bell");f.soupTaken=true;add("soup");
  line("MALVE","»Meine Glocke! Dafür bekommst du die Krönungssuppe. Bring sie bitte in den Saal. Und lass unterwegs niemanden hineinfallen.«");
  stage();return;
 }
 if(id==="soup" && (target==="balduin"||target==="hallDoor") && !f.hallOpen){
  remove("soup");f.hallOpen=true;
  line("BALDUIN","»Krönungssuppe? Das ist eine amtlich anerkannte Ausnahme. Durchgang gewährt!«");
  navigate("hall");stage();return;
 }
 if(id==="wedge" && target==="lectern" && !f.lecternFixed){
  remove("wedge");f.lecternFixed=true;
  fenna("Ein Holzkeil unter dem Pult. Schon steht es fest. Die königliche Ingenieurskunst erreicht einen neuen Höhepunkt.");
  stage();return;
 }
 if(target==="raven" && id==="pebble"){line("KORBINIAN","»Einen Stein? Ist das Euer Versuch, mich zu beleidigen? Ich muss zugeben: originell.«");return;}
 if(target==="baldrian" && id==="crest"){line("BALDRIAN","»Ein Drachenzeichen? Das solltest du unbedingt im Archiv untersuchen. Falls es je wieder geöffnet wird.«");return;}
 if(target==="eberhard" && id==="memo"){talkWith("eberhard");return;}
 if(target==="pot" && id==="spoon"){fenna("So viel Suppe, so wenig Löffel. Es ist dennoch nicht meine Aufgabe, das Problem zu verschlimmern.");return;}
 fenna("Ich versuche, "+items[id].name+" hier einzusetzen. Das Schloss scheint davon nicht besonders beeindruckt.");
}
function interact(id){
 const f=s.flags;
 if(id==="bell"&&!f.bellDropped){fenna("Korbinian hält noch etwas Glänzendes fest.");return;}
 if(id==="memo"&&!f.lecternFixed){fenna("Da steckt zwar etwas, aber das Pult steht im Weg.");return;}
 if(id==="bread"&&f.breadTaken||id==="wedge"&&f.wedgeTaken||id==="pebble"&&f.pebbleTaken||
 id==="crest"&&f.crestTaken||id==="spoon"&&f.spoonTaken||id==="bell"&&f.bellTaken||
 id==="memo"&&f.memoTaken||id==="napkin"&&f.napkinTaken){
  if(s.verb==="take")return fenna("Schon eingesteckt. Wie viele davon soll ich denn noch tragen?");
  if(s.verb==="look")return fenna("Die Stelle ist jetzt leer. Ein schöner Fortschritt für die Einrichtung.");
 }
 if(s.verb==="use"&&s.item){useItem(id);return;}
 if(id==="kitchenDoor"||id==="yardDoor"||id==="hallExit"||id==="hallDoor"){
  if(s.verb==="look"){fenna(descriptions[id]);return;}
  if(id==="kitchenDoor")return navigate("kitchen");
  if(id==="yardDoor"||id==="hallExit")return navigate("yard");
  return navigate("hall");
 }
 if(id==="archive"){return fenna("Das alte Archiv ist verschlossen. Dahinter liegen Antworten … und vermutlich sehr große Staubmäuse. Noch nicht in dieser Demo zugänglich.");}
 if(id==="west"){return fenna("Der Westflügel ist abgesperrt. Ein verrostetes Schild behauptet: »Hier gibt es nichts zu sehen.« Das macht ihn sofort verdächtig.");}
 if(s.verb==="look"){
  if(id==="bell"&&f.bellDropped)return fenna(descriptions.bell);
  if(id==="memo"&&f.lecternFixed)return fenna(descriptions.memo);
  if(id==="lectern"&&f.lecternFixed)return fenna("Das Pult steht jetzt tatsächlich gerade. Unter dem Standfuß steckt ein gefalteter Zettel.");
  return fenna(descriptions[id]||"Hier ist etwas reichlich Merkwürdiges.");
 }
 if(s.verb==="talk"){return talkWith(id);}
 if(s.verb==="take"){return take(id);}
 if(s.verb==="use"){
  if(id==="raven"||id==="malve"||id==="balduin"||id==="baldrian"||id==="eberhard")return talkWith(id);
  if(id==="well")return fenna("Auf dem Brunnenrand ist Platz. Vielleicht könnte ich dort etwas ablegen.");
  if(id==="lectern")return fenna("Es braucht wohl etwas Kleines und Festes unter einem Bein.");
  return fenna(descriptions[id]||"Eine sehr schlechte Idee. Ich mag sie trotzdem.");
 }
}
function getSpots(){return sceneDefs[s.room].spots.filter(([id])=>{
 const f=s.flags;
 if(id==="bell")return f.bellDropped&&!f.bellTaken;
 if(id==="memo")return f.lecternFixed&&!f.memoTaken;
 if(id==="bread")return !f.breadTaken;
 if(id==="wedge")return !f.wedgeTaken;
 if(id==="pebble")return !f.pebbleTaken;
 if(id==="crest")return !f.crestTaken;
 if(id==="spoon")return !f.spoonTaken;
 if(id==="napkin")return !f.napkinTaken;
 return true;
});}
function renderSpots(){
 const box=$("hotspots");box.replaceChildren();
 for(const [id,name] of getSpots()){
  const b=document.createElement("button");b.type="button";b.textContent=name;
  b.addEventListener("click",()=>interact(id));box.append(b);
 }
}
function hint(){
 const f=s.flags;
 if(!f.breadTaken)return fenna("TIPP: Korbinian hat Malves Glocke. Vielleicht liegt in der Küche etwas, das ein Rabe gerne fressen würde.");
 if(!f.bellDropped)return fenna("TIPP: Korbinian will kein Futter aus der Hand. Wähle Brot in der Tasche und benutze es auf dem Brunnen.");
 if(!f.bellTaken)return fenna("TIPP: Die Glocke liegt jetzt beim Brunnen. Nimm sie mit.");
 if(!f.soupTaken)return fenna("TIPP: Gib Mutter Malve ihre Glocke zurück, indem du sie in der Tasche auswählst und auf Malve klickst.");
 if(!f.hallOpen)return fenna("TIPP: Mit der Krönungssuppe solltest du bei Balduin am Eingang zum Saal eine Ausnahme erwirken können.");
 if(!f.wedgeTaken)return fenna("TIPP: Unter der morschen Bank im Burghof steckt ein Holzkeil.");
 if(!f.lecternFixed)return fenna("TIPP: Benutze den Holzkeil auf dem wackeligen Rednerpult.");
 if(!f.memoTaken)return fenna("TIPP: Unter dem nun stabilen Rednerpult liegt eine Randnotiz.");
 if(!f.completed)return fenna("TIPP: Sprich mit Hofmeister Eberhard, nachdem du seine Randnotiz gefunden hast.");
 fenna("Alle Rätsel dieser Demo sind gelöst. Du darfst das Schloss weiter erforschen!");
}
function clearSelection(){s.item=null;drawInv();}
function reset(){
 s=initial();showEnd=false;talking=false;hovering=null;
 $("winModal").hidden=true;$("talkModal").hidden=true;$("storyModal").hidden=false;
 setVerb("look");stage();line("FENNA","Ein neuer Anfang. Und die Krone ist immer noch verschwunden.");
}
function point(e){const box=canvas.getBoundingClientRect();return {x:(e.clientX-box.left)*480/box.width,y:(e.clientY-box.top)*270/box.height};}
function spotAt(e){
 const p=point(e);
 return getSpots().filter(v=>p.x>=v[2]&&p.x<=v[2]+v[4]&&p.y>=v[3]&&p.y<=v[3]+v[5])
 .sort((a,b)=>a[4]*a[5]-b[4]*b[5])[0];
}
// --- Pixelgrafik: alles wird in niedriger Auflösung selbst gerendert. ---
const pal={sky:"#66718f",night:"#393b59",wall:"#92837f",stone:"#a39a8d",shade:"#62586b",
 moss:"#658174",wood:"#8b5d60",cream:"#efe1be",gold:"#edb977",ink:"#323149",roof:"#55435b"};
function R(x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function P(a,c){g.fillStyle=c;g.beginPath();g.moveTo(a[0][0],a[0][1]);for(let i=1;i<a.length;i++)g.lineTo(a[i][0],a[i][1]);g.closePath();g.fill();}
function E(x,y,rx,ry,c){g.fillStyle=c;g.beginPath();g.ellipse(x,y,rx,ry,0,0,2*Math.PI);g.fill();}
function T(t,x,y,col="#f9e6c4",size=9){g.fillStyle=col;g.font="bold "+size+"px monospace";g.fillText(t,x,y);}
function bricks(x,y,w,h,c){for(let j=y+8;j<y+h;j+=17){R(x,j,w,1,c);for(let i=x+((j-y)%2?10:0);i<x+w;i+=31)R(i,j-16,1,16,c);}}
function fennaSprite(x,y,tm){
 const bob=Math.round(Math.sin(tm/340)); const yy=Math.round(y+bob);
 // brown braid, green tunic, boots and messenger sash
 R(x+6,yy+12,8,23,"#6b363e");R(x+4,yy,21,5,"#493043");R(x+6,yy-5,16,8,"#8c5f4a");
 R(x+9,yy+3,13,16,"#dcac85");R(x+22,yy+9,3,3,"#39263c");R(x+16,yy+9,3,2,"#3b3549");
 R(x+5,yy+19,24,28,"#4b7771");R(x+18,yy+20,5,27,"#d7ad76");R(x+27,yy+27,8,6,"#d8aa86");
 R(x+9,yy+42,8,13,"#46425b");R(x+19,yy+42,8,13,"#46425b");
 R(x+6,yy+55,13,5,"#3b303f");R(x+17,yy+55,13,5,"#3b303f");R(x+21,yy+29,9,15,"#765063");
}
function raven(x,y,tm){
 const bob=Math.round(Math.sin(tm/310));
 R(x+9,y+8+bob,20,17,"#22263d");R(x+10,y+2+bob,17,14,"#32314d");R(x+25,y+7+bob,9,4,"#d7aa78");
 R(x+20,y+6+bob,3,3,"#f9df9e");R(x+20,y+7+bob,2,2,"#222137");
 R(x+4,y+21+bob,12,3,"#22263d");R(x+15,y+23+bob,2,7,"#bba58f");R(x+25,y+23+bob,2,7,"#bba58f");
 if(!s.flags.bellDropped){R(x+7,y+27+bob,9,11,"#d9c5a5");R(x+8,y+28+bob,7,5,"#f2dfad");}
}
function baldrianSprite(x,y,tm){
 R(x+5,y+6,24,30,"#58416d");P([[x+3,y+7],[x+16,y-15],[x+29,y+8]],"#4a3b70");R(x+11,y-18,10,5,"#dfac75");
 R(x+11,y+13,18,14,"#d1a18b");R(x+14,y+19,15,18,"#e1d8c2");
 R(x+8,y+37,25,22,"#765885");R(x+12,y+42,4,4,"#efd38d");R(x+3,y+30,9,4,"#c99f79");
 R(x+29,y+34,3,28,"#bca685");R(x+28,y+29,8,7,Math.floor(tm/350)%2?"#efc67c":"#b6d2c4");
}
function guardSprite(x,y){
 R(x+4,y+9,27,16,"#8a8d9c");R(x+8,y+6,20,14,"#bebdc4");R(x+6,y+19,25,28,"#5f607a");
 R(x+8,y+22,20,13,"#c2b6b0");R(x+8,y+25,19,3,"#343349");R(x+3,y+20,6,35,"#9393a0");
 R(x+30,y+20,6,38,"#a2a0a8");R(x+7,y+47,9,23,"#606075");R(x+21,y+47,9,23,"#606075");
 R(x+3,y+68,16,5,"#2a293e");R(x+20,y+68,16,5,"#2a293e");R(x+40,y+8,3,79,"#c5b2a4");
 P([[x+33,y+10],[x+48,y+10],[x+43,y+20]],"#d09f71");
}
function malveSprite(x,y){
 R(x+7,y+2,34,26,"#5e4a52");R(x+8,y+22,33,25,"#dbb095");R(x+12,y+29,4,3,"#383748");
 R(x+30,y+29,4,3,"#383748");R(x+5,y+48,41,48,"#b7b2a0");R(x+15,y+48,20,39,"#7e5e62");
 R(x+2,y+64,12,8,"#d9b091");R(x+37,y+61,14,9,"#d9b091");
 R(x+44,y+41,5,58,"#a87862");E(x+46,y+39,8,9,"#bd9b73");
 R(x+9,y-2,35,12,"#e4d2b9");R(x+18,y-10,19,9,"#e4d2b9");
}
function eberhardSprite(x,y){
 R(x+9,y-4,29,22,"#d6d1c4");R(x+7,y+14,33,24,"#d1aa91");
 R(x+14,y+24,5,3,"#483447");R(x+29,y+24,5,3,"#483447");
 R(x+4,y+38,42,50,"#644a6c");R(x+16,y+38,20,47,"#e3c0a0");R(x+23,y+45,6,32,"#edb979");
 R(x,y+62,12,6,"#d4b2a1");R(x+39,y+62,13,6,"#d4b2a1");
 R(x+10,y+87,12,10,"#484153");R(x+30,y+87,12,10,"#484153");
 R(x+6,y-7,34,6,"#bcb9b8");R(x+6,y-10,32,5,"#ebe4d4");
}
function drawYard(tm){
 R(0,0,480,270,"#626984");R(0,0,480,73,"#42455e");
 E(384,39,18,18,"#e3cfb4");E(391,34,17,18,"#42455e");
 P([[0,139],[60,110],[107,124],[160,105],[216,137],[260,112],[315,131],[370,97],[480,136],[480,176],[0,176]],"#4c5169");
 R(0,132,480,98,"#817a83");bricks(0,132,480,93,"#666875");
 // kitchen tower left
 R(10,48,112,153,"#99887f");bricks(12,58,106,142,"#766e73");
 P([[4,51],[66,20],[126,51]],"#584059");R(35,56,48,9,"#b0a293");
 R(39,112,59,91,"#4b3b4c");P([[39,115],[68,80],[98,115]],"#55445b");
 R(49,122,39,80,"#75545a");R(73,159,5,5,"#dfb480");T("KÜCHE",47,71,"#ebd4b0",10);
 // damaged west wing middle back
 R(237,85,112,117,"#91827d");bricks(239,89,109,108,"#62576a");
 P([[239,89],[254,67],[275,83],[300,62],[336,83],[347,83],[347,95],[239,95]],"#6a505c");
 R(248,99,25,31,"#3d354e");R(308,109,22,26,"#3d354e");
 R(275,140,45,62,"#594a60");P([[278,159],[288,143],[297,158],[309,144],[320,157],[320,191],[275,191]],"#40364e");
 R(275,166,70,4,"#776b75");P([[239,125],[257,133],[251,146],[268,157],[256,176]],"#484459");
 for(let j=0;j<7;j++)R(247+j*14,184-(j%3)*11,9,8,"#567269");
 T("WESTFLÜGEL",242,77,"#ebd8b8",8);
 // Baldrian at tower window
 R(279,51,57,88,"#51465b");R(285,62,42,69,"#29283f");baldrianSprite(292,84,tm);
 // hall facade right
 R(347,65,133,145,"#a99b8a");bricks(350,69,127,139,"#79747c");
 R(358,117,98,92,"#44374d");P([[358,120],[406,69],[457,120]],"#4d435b");R(369,124,76,82,"#655169");
 R(402,125,5,79,"#b19484");R(428,167,5,6,"#e5bc83");
 R(357,104,100,10,"#baa99a");T("GROSSER SAAL",364,63,"#f0d4b1",9);
 // upper beams, heraldic pennant
 R(136,94,6,116,"#6b5b68");P([[122,90],[166,90],[159,139],[144,128],[133,139]],"#8f5265");
 T("K",140,116,"#efd5a5",16);
 // courtyard floor and individual slabs
 P([[0,205],[480,201],[480,270],[0,270]],"#8b8280");
 for(let j=204;j<270;j+=17){R(0,j,480,2,"#646272");for(let i=(j%2?11:0);i<480;i+=56)R(i,j+1,2,16,"#656274");}
 // bench and wedge
 R(57,209,99,7,"#875b5d");R(62,196,90,9,"#a87563");
 R(70,214,8,23,"#513f53");R(146,214,8,23,"#513f53");
 if(!s.flags.wedgeTaken)P([[93,237],[122,222],[126,242]],"#e3ad7a");
 // well
 E(219,201,67,18,"#554e60");R(160,157,118,41,"#7b7380");
 E(219,159,61,22,"#a99b90");E(219,159,45,13,"#263e55");
 R(179,122,8,41,"#5a4255");R(248,122,8,41,"#5a4255");R(176,119,84,6,"#a9867b");
 R(216,125,4,26,"#796c7c");R(212,149,12,6,"#bda98c");
 raven(185,111,tm);
 if(s.flags.bellDropped&&!s.flags.bellTaken){R(239,180,18,8,"#f0d2a0");R(242,177,12,5,"#b9afae");R(244,188,8,3,"#eee6cf");}
 // optional items and patches
 if(!s.flags.pebbleTaken)P([[288,247],[298,239],[315,253],[299,256]],"#d6c0a2");
 if(!s.flags.crestTaken){R(330,231,11,7,"#d9af67");T("✥",329,237,"#654e4b",8);}
 guardSprite(391,142);fennaSprite(119,201,tm);
 R(0,261,480,9,"#5e596c");T("KRUMMFELS · SEIT 413 JAHREN NOTDÜRFTIG REPARIERT",15,259,"#54455a",7);
}
function drawKitchen(tm){
 R(0,0,480,270,"#574354");R(0,0,480,193,"#827268");bricks(0,11,480,185,"#6a6065");
 for(let x=0;x<480;x+=112){R(x,0,10,190,"#4c364a");R(x+3,0,3,190,"#765465");}
 R(0,194,480,76,"#5c4751");for(let j=202;j<270;j+=16){R(0,j,480,2,"#473d4a");for(let x=j%2?0:36;x<480;x+=68)R(x,j,2,16,"#473d4a");}
 // exit left
 R(13,90,61,121,"#362f43");P([[13,92],[43,55],[74,92]],"#524453");R(20,97,48,107,"#715565");R(48,159,5,6,"#e2b47f");
 // window and hearth
 R(94,53,58,78,"#3b374d");R(99,59,48,68,"#406578");R(123,58,4,70,"#bcb0a2");R(97,91,54,4,"#bcb0a2");
 R(235,64,96,131,"#4b3949");P([[236,67],[283,33],[332,67]],"#5b4452");
 R(254,95,61,98,"#292a3e");P([[265,180],[274,141],[283,169],[292,133],[303,177]],Math.floor(tm/260)%2?"#f6ab61":"#efbe77");
 P([[269,184],[277,165],[287,184],[297,159],[310,190]],"#dd7457");R(249,192,72,8,"#bd9985");
 // shelves
 R(115,68,109,9,"#4a3c4b");R(115,117,109,9,"#4a3c4b");
 for(let i=0;i<7;i++){let x=120+i*13;R(x,86+(i%3)*4,8,30-(i%3)*4,["#9c956f","#698b80","#b48c6b"][i%3]);R(x+3,82+(i%3)*4,3,5,"#d3ad81");}
 for(let i=0;i<5;i++)R(124+i*18,48,4,18,"#bda58f");
 // prep table
 R(123,185,153,11,"#a77763");R(130,196,11,54,"#684753");R(260,196,11,54,"#684753");
 R(135,204,117,4,"#876059");
 if(!s.flags.breadTaken){P([[163,171],[174,162],[207,161],[221,172],[220,190],[163,189]],"#e1b781");R(165,182,52,4,"#aa785a");}
 if(!s.flags.spoonTaken){R(231,180,3,17,"#d7c3a8");E(232,177,6,5,"#d3c0a6");}
 // soup pot
 E(301,175,35,18,"#2e3349");R(275,165,54,31,"#777d83");E(301,163,27,10,"#b09d85");
 for(let i=0;i<4;i++){let x=284+i*13;R(x,151-(i%2?5:0),3,8,Math.floor(tm/240)%2?"#dac7a1":"#bba99a");}
 R(267,171,10,6,"#ada8a2");R(330,171,10,6,"#ada8a2");
 // bottles and Malve
 R(366,67,79,13,"#644458");malveSprite(349,111);
 R(349,205,103,11,"#76555a");R(349,215,11,43,"#4f3b4e");R(439,215,10,43,"#4f3b4e");
 T("MALVES REICH",344,38,"#eed4b1",11);fennaSprite(77,197,tm);
}
function drawHall(tm){
 R(0,0,480,270,"#494158");R(0,0,480,191,"#99877d");bricks(0,16,480,176,"#756b74");
 // ribbed vault
 for(let x=20;x<480;x+=110){P([[x-10,0],[x+45,46],[x+100,0]],"#5d5167");R(x+43,28,5,166,"#827380");}
 // old door left
 R(11,94,57,123,"#3d344a");P([[11,94],[38,63],[68,94]],"#5d4c5c");R(20,103,40,103,"#766071");
 R(46,157,5,5,"#e8bd82");
 // tapestry
 R(69,36,104,134,"#a17473");R(76,44,89,117,"#684762");
 R(91,70,61,9,"#d4a877");P([[104,86],[142,86],[124,119]],"#bea182");
 T("K",119,101,"#edd2a8",21);R(80,154,80,6,"#d2ae7e");
 P([[174,47],[187,67],[180,91],[196,106],[189,125]],"#5c5365");
 // throne and dais
 R(184,170,87,37,"#8e7880");R(194,101,58,91,"#775c6b");
 P([[194,103],[206,73],[239,73],[252,103]],"#d1b089");R(202,105,42,81,"#b39373");
 R(205,113,35,67,"#96596b");R(197,171,55,11,"#d2b18a");
 R(184,186,79,16,"#6e5664");T("KRONE?",199,71,"#eed1b1",8);
 // high windows
 for(let x=275;x<=354;x+=46){R(x,40,28,76,"#46445a");P([[x,42],[x+14,23],[x+28,42]],"#665b71");R(x+4,47,20,63,"#76928a");R(x+12,47,3,63,"#baa18e");R(x+4,77,20,3,"#baa18e");}
 // archive door
 R(418,73,60,139,"#403449");P([[418,75],[448,39],[479,75]],"#665567");R(430,86,41,117,"#6d5965");R(460,138,4,4,"#edca85");
 T("ARCHIV",421,54,"#e8c796",9);
 // carpet and floor
 R(0,193,480,77,"#6b5b6a");for(let y=198;y<270;y+=16){R(0,y,480,2,"#524b60");for(let x=(y%32?16:0);x<480;x+=56)R(x,y,2,15,"#544e61");}
 P([[219,192],[351,192],[393,270],[180,270]],"#8e5665");R(220,196,132,5,"#cd9e82");
 // lectern
 P([[266,157],[324,148],[341,163],[284,173]],"#9b7770");
 R(288,172,9,52,"#654955");R(323,164,8,s.flags.lecternFixed?60:64,"#634955");
 R(286,218,53,6,"#aa826e");
 if(!s.flags.lecternFixed)P([[265,154],[323,145],[343,164],[287,176]],"#bd9980");
 if(!s.flags.memoTaken&&s.flags.lecternFixed){R(292,225,33,14,"#edd5a3");R(299,229,18,2,"#76565e");}
 // throne dais & soup
 R(368,194,65,8,"#9f7666");R(378,202,8,28,"#694b5b");R(415,202,7,28,"#694b5b");
 if(s.flags.hallOpen){E(397,190,21,7,"#d9b18a");R(379,181,36,11,"#968579");E(397,181,18,6,"#ddc099");}
 if(!s.flags.napkinTaken)R(413,218,30,12,"#ede2ca");
 eberhardSprite(349,129);fennaSprite(84,204,tm);
}
function draw(tm){
 if(s.room==="yard")drawYard(tm);
 else if(s.room==="kitchen")drawKitchen(tm);
 else drawHall(tm);
 if(hovering){
  const spot=getSpots().find(x=>x[0]===hovering);
  if(spot){g.save();g.strokeStyle="#f5d399";g.setLineDash([4,4]);g.lineWidth=2;
   g.strokeRect(spot[2]+1,spot[3]+1,spot[4]-2,spot[5]-2);g.restore();}
 }
}
let last=0;
function loop(now){if(now-last>70){draw(now);last=now;}requestAnimationFrame(loop);}
canvas.addEventListener("pointermove",e=>{const spot=spotAt(e);hovering=spot?.[0]||null;canvas.style.cursor=spot?"pointer":"crosshair";
 if(spot){$("hoverLabel").textContent=spot[1];$("hoverLabel").hidden=false;}
 else $("hoverLabel").hidden=true;
});
canvas.addEventListener("pointerleave",()=>{hovering=null;$("hoverLabel").hidden=true;});
canvas.addEventListener("click",e=>{if(talking||!$("storyModal").hidden||!$("winModal").hidden)return;
 const spot=spotAt(e);if(spot)interact(spot[0]);else fenna("Hier ist nichts, das Aufmerksamkeit verdient. Nicht einmal meine.");});
$("rooms").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.room)));
$("verbs").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>setVerb(b.dataset.verb)));
$("hintBtn").addEventListener("click",hint);
$("storyBtn").addEventListener("click",()=>{$("storyModal").hidden=false;$("closeStory").focus();});
function dismissStory(){$("storyModal").hidden=true;s.flags.introSeen=true;persist();canvas.focus({preventScroll:true});}
$("closeStory").addEventListener("click",dismissStory);$("beginBtn").addEventListener("click",dismissStory);
$("closeTalk").addEventListener("click",closeTalk);
$("continueBtn").addEventListener("click",()=>{$("winModal").hidden=true;showEnd=false;canvas.focus({preventScroll:true});});
$("restartEndBtn").addEventListener("click",reset);
$("resetBtn").addEventListener("click",()=>{if(confirm("Wirklich neu beginnen? Dein bisheriger Spielstand wird gelöscht."))reset();});
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"){if(!$("winModal").hidden){$("winModal").hidden=true;return;}
  if(!$("talkModal").hidden){closeTalk();return;}if(!$("storyModal").hidden){dismissStory();return;}
  clearSelection();return;}
 if(!$("storyModal").hidden||!$("talkModal").hidden||!$("winModal").hidden)return;
 if(["1","2","3","4"].includes(e.key))setVerb(["look","take","use","talk"][Number(e.key)-1]);
 if(e.key.toLowerCase()==="h"&&!e.ctrlKey&&!e.metaKey)hint();
});
$("storyModal").hidden=!!s.flags.introSeen;
$("winModal").hidden=true;
$("talkModal").hidden=true;
setVerb("look");stage();line(s.who,s.said);
requestAnimationFrame(loop);
})();