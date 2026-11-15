/* Wissensspeicher: clientseitiger, datensparsamer Planungsassistent. */
(function () {
  "use strict";
  const STORAGE_KEY = "wissensspeicher_v1";
  const VERSION = 1;
  const CATEGORIES = {
    app: "Offline-Apps",
    karte: "Karten & Orientierung",
    wissen: "Wissensarchive",
    bbk: "BBK & Vorsorge",
    medizin: "Erste Hilfe & Gesundheit",
    reparatur: "Reparaturen"
  };

  const RESOURCES = [
    { id:"organic-maps", title:"Organic Maps", category:"karte", format:"Android-App", size:"Kartengröße abhängig von Region", priority:1, description:"Einfach nutzbare OpenStreetMap-Karten mit Suche und Routing für Auto, Rad und Fußwege ohne Internet.", url:"https://organicmaps.app/", tip:"NRW und wichtige Nachbarregionen in der App laden. GPS und eine komplette Route im Flugmodus prüfen." },
    { id:"osmand", title:"OsmAnd", category:"karte", format:"Android-App", size:"Abhängig von Karten und Zusatzdaten", priority:2, description:"Detaillierte OSM-Navigation, GPX-Tracks und Geländeoptionen. Als Ergänzung oder Alternative zu Organic Maps.", url:"https://osmand.net/", tip:"Nur gewünschte Regionen und bei Bedarf Höhen-/Geländedaten herunterladen." },
    { id:"kiwix-app", title:"Kiwix für Android", category:"app", format:"Android-App", size:"Archive separat herunterladen", priority:1, description:"Liest lokale ZIM-Wissensarchive – zum Beispiel Wikipedia, medizinische Inhalte und Reparaturwissen.", url:"https://kiwix.org/en/applications/", tip:"Nach der Installation mindestens ein kleines ZIM-Archiv offline testen." },
    { id:"librera", title:"Librera Reader", category:"app", format:"Android-App", size:"Wenig Speicher; Dateien zusätzlich", priority:1, description:"Lokaler Reader für PDF, EPUB und weitere Formate mit Suche und Lesezeichen.", url:"https://f-droid.org/packages/com.foobnix.pro.pdf.reader/", tip:"Einen BBK-PDF-Ratgeber in deinem lokalen Ordner öffnen." },
    { id:"nina", title:"NINA – Warn-App", category:"app", format:"Android-App · Warnungen nur online", size:"Keine Offline-Warnungen", priority:1, description:"Amtliche Warnmeldungen und ergänzende Vorsorgehinweise. Für aktuelle Meldungen ist eine Verbindung nötig.", url:"https://www.bbk.bund.de/DE/Warnung-Vorsorge/Warn-App-NINA/warn-app-nina_node.html", tip:"App installieren und Warngebiete einrichten. NINA liefert keine neuen Warnungen im Flugmodus.", onlineOnly:true },
    { id:"bbk-guide", title:"BBK: Vorsorgen für Krisen und Katastrophen", category:"bbk", format:"PDF", size:"ca. 7 MB", priority:1, description:"Offizieller Ratgeber zu Selbstversorgung, Kommunikation, Stromausfall, Schutz, Evakuierung und Krisenbewältigung.", url:"https://www.bbk.bund.de/SharedDocs/Downloads/DE/Mediathek/Publikationen/Buergerinformationen/Ratgeber/BBK-Vorsorgen-fuer-Krisen-und-Katastrophen.pdf?__blob=publicationFile&v=42", tip:"Als PDF unter 02_KRISENVORSORGE speichern.", isFile:true },
    { id:"bbk-checklist", title:"BBK: Checklisten für Krisen und Katastrophen", category:"bbk", format:"PDF", size:"ca. 400 KB", priority:1, description:"Praktische Listen zu Essen, Wasser, Strom, Hausapotheke, Notgepäck und Dokumenten.", url:"https://www.bbk.bund.de/SharedDocs/Downloads/DE/Mediathek/Publikationen/Buergerinformationen/Ratgeber/Checklisten-zur-Vorsorge-Krisen-und-Katastrophen.pdf?__blob=publicationFile&v=17", tip:"Als PDF sichern und möglichst eine Papierkopie aufbewahren.", isFile:true },
    { id:"bbk-blackout", title:"BBK: Stromausfall – Vorsorge und Selbsthilfe", category:"bbk", format:"PDF", size:"ca. 700 KB", priority:1, description:"Konkrete Hinweise zu Strom, Wärme, Licht, Wasserversorgung und Informationsmöglichkeiten bei einem längeren Ausfall.", url:"https://www.bbk.bund.de/SharedDocs/Downloads/DE/Mediathek/Publikationen/Buergerinformationen/stromausfall-vorsorge-selbsthilfe.pdf?__blob=publicationFile&v=11", tip:"Als PDF speichern; auf Gefahren durch offene Flammen und CO achten.", isFile:true },
    { id:"bbk-compact", title:"BBK: Kompaktchecklisten", category:"bbk", format:"Downloadseite für mehrere PDFs", size:"Je PDF etwa 80–100 KB", priority:2, description:"Einzelne Checklisten für Lebensmittel, Hausapotheke, Notgepäck, Brandschutz und Hygiene.", url:"https://www.bbk.bund.de/DE/Warnung-Vorsorge/Vorsorge/Ratgeber-Checkliste/Kompakt-Checklisten/kompakt-checklisten.html", tip:"Gewünschte Checklisten einzeln öffnen und lokal als PDF speichern." },
    { id:"bbk-food", title:"BBK: Essen und Trinken bevorraten", category:"bbk", format:"Ratgeberseite", size:"Zum Beispiel als PDF speichern", priority:2, description:"Prinzip des lebenden Vorrats, Auswahl lagerfähiger Lebensmittel, Flüssigkeitsbedarf und Hinweise für besondere Bedürfnisse.", url:"https://www.bbk.bund.de/DE/Warnung-Vorsorge/Vorsorge/So-koennen-Sie-sich-vorbereiten/Bevorraten/bevorraten_node.html", tip:"Seite bei Bedarf als PDF drucken oder nur die Ratgeber-PDF herunterladen." },
    { id:"bbk-docs", title:"BBK: Wichtige Dokumente sichern", category:"bbk", format:"Ratgeberseite", size:"Zum Beispiel als PDF speichern", priority:2, description:"Welche Dokumente zu einer griffbereiten Mappe gehören und wie Kopien sicher hinterlegt werden.", url:"https://www.bbk.bund.de/DE/Warnung-Vorsorge/Vorsorge/So-koennen-Sie-sich-vorbereiten/Dokumente-sichern/dokumente-sichern_node.html", tip:"Sensible Unterlagen nicht unverschlüsselt in der Web-App oder einer JSON-Sicherung erfassen." },
    { id:"bbk-bag", title:"BBK: Notgepäck", category:"bbk", format:"Ratgeberseite", size:"Zum Beispiel als PDF speichern", priority:2, description:"Packliste für Evakuierungen, Kleidung, Dokumente, Medikamente, Licht, Strom und Verpflegung.", url:"https://www.bbk.bund.de/DE/Warnung-Vorsorge/Vorsorge/So-koennen-Sie-sich-vorbereiten/Notgepaeck/notgepaeck_node.html", tip:"Notgepäck auch physisch vorbereiten – keine rein digitale Lösung." },
    { id:"bbk-medicine", title:"BBK: Die Hausapotheke", category:"bbk", format:"Ratgeberseite", size:"Zum Beispiel als PDF speichern", priority:2, description:"Bedarfsgerechte Medikamente, Verbandsmaterialien sowie sichere und kindergeschützte Lagerung.", url:"https://www.bbk.bund.de/DE/Warnung-Vorsorge/Vorsorge/So-koennen-Sie-sich-vorbereiten/Hausapotheke/hausapotheke_node.html", tip:"Persönliche Medikation mit Apotheke oder ärztlicher Praxis abstimmen." },
    { id:"dguv-erstehilfe", title:"DGUV: Handbuch zur Ersten Hilfe", category:"medizin", format:"PDF", size:"120 Seiten", priority:1, description:"Bebildertes Grundlagenhandbuch zu häufigen Erste-Hilfe-Situationen; ideal als Auffrischung nach einem Kurs.", url:"https://publikationen.dguv.de/widgets/pdf/download/article/826", tip:"Unter 01_SOFORTHILFE speichern. Ein Handbuch ersetzt keinen Erste-Hilfe-Kurs.", isFile:true },
    { id:"dav-erstehilfe", title:"DAV: Erste Hilfe im Bergsport", category:"medizin", format:"PDF", size:"Outdoor-Notfälle", priority:2, description:"Verletzungen, Unterkühlung, Hitze und Hilfeleistung in abgelegeneren Situationen.", url:"https://www.alpenverein.de/files/2207-erste-hilfe-broschuere_ol_neu.pdf", tip:"Unter 03_SURVIVAL_OUTDOOR sichern.", isFile:true },
    { id:"who-wasser", title:"WHO: Notfallaufbereitung von Trinkwasser", category:"medizin", format:"PDF · Englisch", size:"Kurzes technisches Merkblatt", priority:2, description:"Grundlagen der Wasserbehandlung für Notsituationen. Vorsicht: Chemische Verunreinigungen werden nicht zuverlässig entfernt.", url:"https://www.who.int/docs/default-source/wash-documents/wash-in-emergencies/technical-notes-on-wash-in-emergencies/who-tn-05-emergency-treatment-of-drinking-water-at-the-point-of-use.pdf", tip:"Als Fachinformation sichern, keine improvisierte Trinkwasserfreigabe daraus ableiten.", isFile:true },
    { id:"kiwix-ifixit", title:"iFixit-Reparaturarchiv auf Kiwix", category:"reparatur", format:"ZIM-Archiv", size:"Mehrere GB, editionsabhängig", priority:1, description:"Viele Reparaturanleitungen lokal verfügbar; deutschsprachige Ausgaben im Kiwix-Katalog suchen.", url:"https://library.kiwix.org/", tip:"Im Katalog nach „ifixit“ suchen, deutsches Archiv auswählen und die ZIM-Datei in Kiwix testen." },
    { id:"ifixit", title:"iFixit: Anleitungen für eigene Geräte", category:"reparatur", format:"PDF-Export einzelner Anleitungen", size:"Je nach Anleitung", priority:2, description:"Anleitungen für Elektronik, Haushaltsgeräte und Werkzeuge gezielt offline sichern.", url:"https://de.ifixit.com/", tip:"Vor allem für Geräte sammeln, die du selbst besitzt. Netzspannungs- und Gasreparaturen Fachkräften überlassen." },
    { id:"kiwix-wikimed", title:"Kiwix: medizinische Wikipedia-Auswahl", category:"wissen", format:"ZIM-Archiv", size:"Mehrere hundert MB", priority:2, description:"Medizinische Enzyklopädieinhalte als offline durchsuchbares Nachschlagewerk.", url:"https://library.kiwix.org/", tip:"Nach „med“ bzw. „medical“ suchen und gewünschte Sprache kontrollieren. Kein Ersatz für ärztliche Beurteilung." },
    { id:"kiwix-wikibooks", title:"Kiwix: Wikibooks Deutsch", category:"wissen", format:"ZIM-Archiv", size:"Mehrere GB", priority:2, description:"Freie Lehrbücher und praktische Grundlagen aus zahlreichen Themenfeldern.", url:"https://library.kiwix.org/", tip:"Deutschsprachiges Archiv bewusst auswählen und vollständig laden." },
    { id:"kiwix-voyage", title:"Kiwix: Wikivoyage Deutsch", category:"wissen", format:"ZIM-Archiv", size:"Ca. 1–2 GB", priority:2, description:"Reise- und Ortswissen für unterwegs, zusätzlich zu Offline-Karten.", url:"https://library.kiwix.org/", tip:"Einige Reiseinformationen altern. Kontaktdaten und Öffnungszeiten nicht als aktuell ansehen." },
    { id:"kiwix-wikipedia", title:"Kiwix: Wikipedia Deutsch (kompakt)", category:"wissen", format:"ZIM-Archiv", size:"Mehrere GB", priority:2, description:"Kompakter Wissensüberblick offline; Mini-Ausgaben enthalten nicht die vollständigen Artikel.", url:"https://library.kiwix.org/", tip:"Größe vorab prüfen, ausreichend freien Speicher berücksichtigen." },
    { id:"kompass", title:"Orientierung mit Karte und Kompass", category:"karte", format:"Downloadseite für Handbuch", size:"Umfangreiches PDF", priority:2, description:"Zusatzwissen für Geländenavigation ohne Mobilfunk oder GPS.", url:"https://die-kompassmacher.de/orientierung/index.php/", tip:"Handbuch auf der Seite herunterladen und die Anwendung analog üben." }
  ];

  const SETUP = [
    ["ordner","Ordnerstruktur für PDFs und EPUBs anlegen","Zum Beispiel SOFORTHILFE, KRISENVORSORGE, OUTDOOR und REPARATUREN."],
    ["reader","PDF-/EPUB-Reader ausprobieren","Mindestens ein PDF lokal speichern und daraus öffnen."],
    ["maps","Offline-Karten für deine Region herunterladen","Nicht nur die App installieren: Die Kartendaten müssen auf dem Gerät liegen."],
    ["kiwix","Kiwix installieren","Die App allein enthält noch keine Wissensdatenbank."],
    ["archive","Mindestens ein passendes ZIM-Archiv sichern","Zum Beispiel iFixit oder ein kompaktes Medizin-/Wikipedia-Archiv."],
    ["manuals","BBK-Ratgeber und Erste-Hilfe-PDF lokal speichern","Downloads möglichst in thematischen Ordnern ablegen."],
    ["extras","Wichtige eigene Gerätehandbücher sichern","Etwa Fahrrad, Haushalt, Ladegeräte und Werkzeug."],
    ["backup","Eine Kopie von Dateien und Planungsstand anlegen","USB-Stick oder zweite Speichermöglichkeit verwenden."],
    ["power","Powerbank und analoge Alternativen vorhalten","Papierkontakte, Taschenlampe und unabhängiges Radio."],
  ];
  const OFFLINE = [
    ["flight","Flugmodus aktivieren und WLAN ausschalten","Kein Mobilfunk und kein WLAN während des gesamten Tests."],
    ["map","Offline-Karte öffnen und GPS-Standort prüfen","Satellitenempfang kann in Gebäuden ausbleiben."],
    ["routing","Eine Route ohne Internet berechnen","Eine sinnvolle Strecke innerhalb der geladenen Region wählen."],
    ["pdf","BBK-Ratgeber und Erste-Hilfe-PDF öffnen","Dateien aus dem tatsächlichen Offline-Ordner starten."],
    ["zim","Kiwix-Archiv öffnen und einen Begriff suchen","Nicht nur den Archivnamen anzeigen lassen."],
    ["contacts","Wichtige Kontaktliste offline verfügbar haben","Besser zusätzlich eine ausgedruckte Liste bereithalten."],
    ["backupcheck","Zweite Kopie und Ladeoption prüfen","Backup-Medium, Kabel, Powerbank und Ladezustand kontrollieren."],
  ];
  const STOCK = [
    ["water3","Getränke für mindestens drei Tage","Rechne mit zwei Litern pro Person und Tag als BBK-Planungswert."],
    ["food3","Haltbare Lebensmittel für mindestens drei Tage","Eine individuell geeignete Auswahl ohne dauerhafte Kühlung."],
    ["ready","Ohne Erhitzen essbare Produkte vorhanden","Zum Beispiel Konserven, Nüsse, Knäckebrot oder geeignete Fertigmahlzeiten."],
    ["opener","Mechanischer Dosenöffner vorhanden","Funktioniert auch ohne Strom."],
    ["rotation","Vorrat wird auf Haltbarkeit geprüft und rotiert","Ältere Produkte zuerst verwenden und regelmäßig ersetzen."],
    ["water10","Wasservorrat auf zehn Tage ausgebaut","Langfristiges Ziel, nicht Voraussetzung für den sinnvollen Einstieg."],
    ["food10","Lebensmittelvorrat auf zehn Tage ausgebaut","Mengen individuell anhand deiner üblichen Ernährung kalkulieren."],
    ["special","Kinder, Unverträglichkeiten und ggf. Tiere berücksichtigt","Bedarf an Babynahrung, Spezialkost und Tierfutter gesondert prüfen."]
  ];
  const PREP = [
    ["radio","Batterie-, Solar- oder Kurbelradio betriebsbereit","Mit geeigneten Batterien oder einer anderen Energiequelle."],
    ["lights","Taschenlampen und Ersatzbatterien griffbereit","LED-Licht ist in vielen Situationen sicherer als offene Flammen."],
    ["powerbank","Geladene Powerbank samt Kabel vorhanden","Regelmäßig Ladestand und Kompatibilität prüfen."],
    ["warmth","Decken, warme Kleidung und Schlafsäcke vorhanden","Bei Heizungsstillstand an zusätzliche Schichten denken."],
    ["cook","Sichere alternative Essenszubereitung überlegt","Kein Campingkocher oder Grill in geschlossenen Räumen."],
    ["hygiene","Hygieneartikel, Müllbeutel und Sanitärplan","Auch an Toilettenausfall und Händehygiene denken."],
    ["medicine","Hausapotheke und persönliche Medikamente überprüft","Kinderzugriff verhindern; Aufbewahrung und Haltbarkeit beachten."],
    ["fire","Rauchmelder und Brandschutz überprüft","Warnmelder funktionsfähig halten; CO-Risiken vermeiden."],
    ["documents","Griffbereite Dokumentenmappe vorbereitet","Originale und erforderliche Kopien geordnet sichern."],
    ["contact","Telefonnummern und Treffpunkte auf Papier","Mindestens eine Kontaktperson außerhalb der Region festlegen."],
    ["bag","Notgepäck und notwendige Schlüssel griffbereit","Kleidung, Medikamente, Wasser, Dokumente, Taschenlampe."],
    ["cash","Kleiner Bargeldvorrat und Warn-App organisiert","Bei Stromausfall können Kartenzahlungen ausfallen; NINA braucht Netz."]
  ];

  function defaults(){
    return {version:VERSION, resources:{}, setup:{}, offline:{}, stock:{}, prep:{}, people:4, days:3, haveWater:0, custom:[], lastTest:null};
  }
  function sanitizeUrl(value){
    if (!value) return "";
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
      return parsed.href;
    } catch(_err) { return ""; }
  }
  function normalize(input){
    const out = defaults();
    if (!input || typeof input !== "object" || Array.isArray(input)) return out;
    ["resources","setup","offline","stock","prep"].forEach(function(k){
      const source = input[k];
      if (!source || typeof source !== "object" || Array.isArray(source)) return;
      const allowed = k === "resources" ? RESOURCES.map(function(x){ return x.id; }).concat(
        Array.isArray(input.custom) ? input.custom.map(function(x){return x && x.id;}) : []
      ) : (k==="setup"?SETUP:k==="offline"?OFFLINE:k==="stock"?STOCK:PREP).map(function(x){return x[0];});
      allowed.forEach(function(id){
        if(typeof id !== "string") return;
        if(k==="resources") out[k][id] = [0,1,2].includes(Number(source[id])) ? Number(source[id]) : 0;
        else out[k][id] = source[id] === true;
      });
    });
    out.people = Number.isInteger(Number(input.people)) ? Math.max(1,Math.min(30,Number(input.people))) : 4;
    out.days = [3,5,7,10].includes(Number(input.days)) ? Number(input.days) : 3;
    out.haveWater = Number.isFinite(Number(input.haveWater)) ? Math.max(0,Math.min(99999,Number(input.haveWater))) : 0;
    if (Array.isArray(input.custom)) out.custom = input.custom.slice(0,100).filter(function(x){return x && typeof x.title==="string" && x.title.trim();}).map(function(x,i){
      return {id:"custom-" + (typeof x.id==="string" && /^custom-[a-z0-9-]{1,60}$/i.test(x.id.slice(0,67)) ? x.id.slice(7,60) : "import-" + i), title:x.title.trim().slice(0,100), category:"reparatur",format:"Eigene Quelle",size:"",priority:2,description:(typeof x.note==="string"?x.note:"").slice(0,240),url:sanitizeUrl(x.url),tip:"Eigene Ressource; offline sichern und im Flugmodus testen.",custom:true};
    });
    if (typeof input.lastTest === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.lastTest)) out.lastTest = input.lastTest;
    return out;
  }
  let state;
  let storageOK = true;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    state = saved ? normalize(JSON.parse(saved)) : defaults();
  } catch(_err) { state = defaults(); storageOK = false; }
  const $ = function(id){ return document.getElementById(id); };
  function save(){
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); storageOK = true; }
    catch(_err) { storageOK = false; toast("Speicherung im Browser nicht verfügbar. Bitte den JSON-Export nutzen."); }
  }
  let toastTimeout;
  function toast(message){
    const node=$("toast");node.textContent=message;node.hidden=false;
    clearTimeout(toastTimeout);
    toastTimeout=setTimeout(function(){node.hidden=true;},3800);
  }
  function node(tag, className, content){
    const result=document.createElement(tag);
    if(className) result.className=className;
    if(content!==undefined && content!==null) result.textContent=String(content);
    return result;
  }
  function calcStats(){
    const totalChecks = SETUP.length+OFFLINE.length;
    const doneChecks = SETUP.filter(function(x){return !!state.setup[x[0]];}).length + OFFLINE.filter(function(x){return !!state.offline[x[0]];}).length;
    const all = RESOURCES.concat(state.custom);
    return {
      total:totalChecks,
      done:doneChecks,
      secured:all.filter(function(r){return (state.resources[r.id]||0)>0;}).length,
      checked:all.filter(function(r){return !r.onlineOnly && (state.resources[r.id]||0)===2;}).length
    };
  }
  function renderStats(){
    const s=calcStats(), percent=Math.round(100*s.done/Math.max(1,s.total));
    $("stat-steps").textContent=s.done+" / "+s.total;
    $("stat-resources").textContent=s.secured;
    $("stat-offline").textContent=s.checked;
    $("fill-steps").style.width=percent+"%";
    $("bar-steps").setAttribute("aria-valuenow",String(percent));
    $("stat-steps-pct").textContent=percent+" % erledigt";
  }
  function renderNext(){
    const target=$("next-tasks");target.replaceChildren();
    let pending=SETUP.filter(function(x){return !state.setup[x[0]];});
    if(pending.length===0) pending=OFFLINE.filter(function(x){return !state.offline[x[0]];});
    if(pending.length===0){target.append(node("p","subtle","Alle Einrichtungsschritte und Offline-Tests sind abgehakt. Prüfe die Sammlung regelmäßig auf Aktualität."));return;}
    pending.slice(0,4).forEach(function(item){
      const line=node("div","checkrow");
      const n=node("span","pill rust","Offen");
      const box=node("div","");
      box.append(node("strong","",item[1]),node("span","help",item[2]));
      line.append(n,box);target.append(line);
    });
  }
  function showTab(tab, doHash){
    const allowed=["start","katalog","vorrat","test","daten"];
    if(!allowed.includes(tab)) tab="start";
    document.querySelectorAll("[data-tab]").forEach(function(button){
      const active=button.dataset.tab===tab;
      button.setAttribute("aria-selected",String(active));
      button.tabIndex=active?0:-1;
    });
    document.querySelectorAll(".panel").forEach(function(panel){
      panel.hidden=panel.id!=="panel-"+tab;
    });
    if(doHash && location.hash!=="#"+tab) history.replaceState(null,"","#"+tab);
    if(tab==="katalog") renderResources();
    if(tab==="daten") renderCustom();
    window.scrollTo({top:0,behavior:"instant"});
  }
  function allResources(){ return RESOURCES.concat(state.custom); }
  function renderResources(){
    const search=$("search").value.toLocaleLowerCase("de").trim();
    const category=$("filter-category").value;
    const status=$("filter-status").value;
    const all=allResources();
    const matching=all.filter(function(r){
      const content=[r.title,r.description,r.format,r.tip].join(" ").toLocaleLowerCase("de");
      return (!search || content.includes(search)) && (category==="all" || r.category===category) && (status==="all" || String(state.resources[r.id]||0)===status);
    });
    const container=$("resources");container.replaceChildren();
    $("catalog-counter").textContent=matching.length+" / "+all.length+" Quellen";
    if(matching.length===0){const empty=node("div","empty span-all","Keine passenden Quellen gefunden. Suche oder Filter ändern.");container.append(empty);return;}
    matching.forEach(function(r){
      const item=node("article","card resource");
      const top=node("div","resource-top");
      const titleBox=node("div","");
      titleBox.append(node("h3","",r.title),node("div","small subtle",r.format+(r.size?" · "+r.size:"")));
      const pill=node("span","pill"+(r.priority===1?" sage":""),CATEGORIES[r.category]||"Eigene Quelle");
      top.append(titleBox,pill);
      const desc=node("p","resource-description",r.description);
      const note=node("div","resource-note",r.tip);
      const actions=node("div","resource-actions");
      if(r.url){
        const link=node("a","btn smallbtn sage",r.isFile?"PDF öffnen ↗":"Quelle öffnen ↗");
        link.href=sanitizeUrl(r.url);link.target="_blank";link.rel="noopener noreferrer";
        actions.append(link);
      } else actions.append(node("span","small subtle","Kein Link hinterlegt"));
      const select=node("select","resource-status");
      select.setAttribute("aria-label","Status: "+r.title);
      const options=[[0,"Noch offen"],[1,"Heruntergeladen / eingerichtet"]];
      if(!r.onlineOnly) options.push([2,"Im Flugmodus geprüft"]);
      options.forEach(function(pair){
        const opt=document.createElement("option");opt.value=String(pair[0]);opt.textContent=pair[1];select.append(opt);
      });
      const current=state.resources[r.id]||0;
      select.value=String(r.onlineOnly ? Math.min(1,current) : current);
      select.addEventListener("change",function(){
        state.resources[r.id]=Number(select.value);
        save();renderStats();renderNext();
        if($("filter-status").value!=="all") renderResources();
        toast(select.value==="2"?"Offline-Prüfung eingetragen.":"Status gespeichert.");
      });
      actions.append(select);
      item.append(top,desc,note,actions);
      container.append(item);
    });
  }
  function renderCheckList(targetId,items,key){
    const target=$(targetId);target.replaceChildren();
    items.forEach(function(item){
      const row=node("div","checkrow"+(state[key][item[0]]?" checked":""));
      const check=document.createElement("input");check.type="checkbox";check.id="check-"+key+"-"+item[0];check.checked=!!state[key][item[0]];
      const label=document.createElement("label");label.htmlFor=check.id;
      label.append(node("strong","",item[1]),node("span","help",item[2]));
      check.addEventListener("change",function(){
        state[key][item[0]]=check.checked;
        row.classList.toggle("checked",check.checked);
        if(key==="offline"){
          const allDone=OFFLINE.every(function(x){return !!state.offline[x[0]];});
          state.lastTest=allDone?new Date().toISOString().slice(0,10):null;
          updateLastTest();
        }
        save();renderStats();renderNext();
      });
      row.append(check,label);target.append(row);
    });
  }
  function updateLastTest(){
    $("last-tested").textContent=state.lastTest?"Letzter vollständig abgehakter Offline-Test: "+state.lastTest:"Noch kein vollständig abgeschlossener Offline-Test.";
  }
  function updateWater(){
    const people=Math.max(1,Math.min(30,parseInt($("people").value,10)||1));
    const days=[3,5,7,10].includes(parseInt($("days").value,10))?parseInt($("days").value,10):3;
    const have=Math.max(0,Math.min(99999,Number($("have-water").value)||0));
    state.people=people;state.days=days;state.haveWater=have;
    const total=people*days*2,missing=Math.max(0,total-have),p=Math.min(100,Math.round(100*have/total));
    $("need-water").textContent=fmt(total)+" l";
    $("missing-water").textContent=fmt(missing)+" l";
    $("fill-water").style.width=p+"%";
    $("bar-water").setAttribute("aria-valuenow",String(p));
    $("water-caption").textContent=fmt(have)+" von "+fmt(total)+" Litern vorhanden · "+p+" % des Zielbedarfs";
    save();
  }
  function fmt(x){return new Intl.NumberFormat("de-DE",{maximumFractionDigits:1}).format(x);}
  function renderCustom(){
    const target=$("custom-list");target.replaceChildren();$("custom-counter").textContent=state.custom.length+" Einträge";
    if(!state.custom.length){target.append(node("p","small subtle","Noch keine eigenen Quellen hinzugefügt."));return;}
    state.custom.forEach(function(r){
      const row=node("div","checkrow");
      const content=node("div","");content.style.flex="1";
      content.append(node("strong","",r.title));
      if(r.description)content.append(node("span","help",r.description));
      if(r.url){const a=node("a","small","Quelle öffnen");a.href=sanitizeUrl(r.url);a.target="_blank";a.rel="noopener noreferrer";content.append(a);}
      const del=node("button","btn danger smallbtn","Entfernen");del.type="button";del.setAttribute("aria-label","Eintrag "+r.title+" entfernen");
      del.addEventListener("click",function(){
        if(!confirm("Diesen eigenen Eintrag entfernen?"))return;
        state.custom=state.custom.filter(function(x){return x.id!==r.id;});
        delete state.resources[r.id];save();renderCustom();renderResources();renderStats();
      });
      row.append(content,del);target.append(row);
    });
  }
  function addCustom(event){
    event.preventDefault();
    const title=$("custom-title").value.trim();
    const urlInput=$("custom-url").value.trim();
    const url=sanitizeUrl(urlInput);
    if(!title){toast("Bitte einen Titel eingeben.");return;}
    if(urlInput&&!url){toast("Nur gültige http- oder https-Links verwenden.");return;}
    if(state.custom.length>=100){toast("Maximal 100 eigene Einträge. Bitte vorher Einträge entfernen.");return;}
    const id="custom-"+Date.now().toString(36)+"-"+Math.floor(Math.random()*10000).toString(36);
    state.custom.push({id:id,title:title.slice(0,100),category:"reparatur",format:"Eigene Quelle",size:"",priority:2,description:$("custom-note").value.trim().slice(0,240),url:url,tip:"Eigene Ressource; herunterladen und im Flugmodus prüfen.",custom:true});
    save();$("custom-form").reset();renderCustom();renderResources();toast("Eigene Quelle hinzugefügt.");
  }
  function exportData(){
    const payload={app:"Wissensspeicher",version:VERSION,exportiert:new Date().toISOString(),data:state};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json;charset=utf-8"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="wissensspeicher-backup-"+new Date().toISOString().slice(0,10)+".json";
    document.body.append(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},2000);
    toast("JSON-Backup erzeugt. Download im Dateimanager prüfen.");
  }
  async function importData(event){
    const file=event.target.files&&event.target.files[0];if(!file)return;
    if(file.size>2000000){toast("Backup-Datei ist zu groß.");event.target.value="";return;}
    try{
      const value=JSON.parse(await file.text());
      if(!value||value.app!=="Wissensspeicher"||!value.data||Number(value.version)!==VERSION)throw Error("Ungültiges Backup");
      if(!confirm("Aktuelle Planungsdaten durch dieses Backup ersetzen?"))return;
      state=normalize(value.data);save();refreshAll();toast("Backup importiert.");
    }catch(_err){toast("JSON-Datei konnte nicht als gültiges Wissensspeicher-Backup gelesen werden.");}
    finally{event.target.value="";}
  }
  function refreshAll(){
    $("people").value=String(state.people);$("days").value=String(state.days);$("have-water").value=String(state.haveWater);
    updateWater();renderStats();renderNext();renderResources();renderCustom();
    renderCheckList("stock-checks",STOCK,"stock");
    renderCheckList("prep-checks",PREP,"prep");
    renderCheckList("setup-checks",SETUP,"setup");
    renderCheckList("offline-checks",OFFLINE,"offline");
    updateLastTest();
  }
  document.querySelectorAll("[data-tab]").forEach(function(button){
    button.addEventListener("click",function(){showTab(button.dataset.tab,true);});
  });
  document.querySelectorAll("[data-go]").forEach(function(button){
    button.addEventListener("click",function(){showTab(button.dataset.go,true);});
  });
  window.addEventListener("hashchange",function(){showTab(location.hash.slice(1),false);});
  ["search","filter-category","filter-status"].forEach(function(id){
    $(id).addEventListener(id==="search"?"input":"change",renderResources);
  });
  ["people","have-water"].forEach(function(id){$(id).addEventListener("input",updateWater);});
  $("days").addEventListener("change",updateWater);
  $("custom-form").addEventListener("submit",addCustom);
  $("export").addEventListener("click",exportData);
  $("import").addEventListener("change",importData);
  $("reset").addEventListener("click",function(){
    if(!confirm("Alle Häkchen, Statusmarkierungen und eigenen Quellen löschen?"))return;
    state=defaults();save();refreshAll();toast("Planungsdaten zurückgesetzt.");
  });
  $("print-stock").addEventListener("click",function(){window.print();});
  refreshAll();showTab(location.hash.slice(1)||"start",false);
  if(!storageOK)toast("Dein Browser erlaubt keine dauerhafte Speicherung. Nutze bitte den JSON-Export.");
})();