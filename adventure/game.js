"use strict";
(() => {
  const canvas = document.getElementById("scene");
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  const $ = id => document.getElementById(id);
  const SAVE_KEY = "nebelhafen-adventure-v1";
  const itemInfo = {
    coin: ["Kupfermünze", "◉"],
    hook: ["Angelhaken", "⌁"],
    rope: ["Schnur", "〰"],
    rod: ["Improvisierte Angel", "⚑"],
    lens: ["Messinglinse", "◇"],
    oil: ["Lampenöl", "▣"],
    key: ["Turmschlüssel", "⚿"]
  };
  const scenes = {
    pier: {
      label: "NEBELHAFEN · ALTE MOLE",
      spots: [
        { id: "tavern", label: "Taverne »Zum schiefen Anker«", box: [19, 72, 113, 150] },
        { id: "barrel", label: "Altes Fass", box: [91, 156, 133, 202] },
        { id: "hook", label: "Verlorener Angelhaken", box: [159, 184, 189, 208] },
        { id: "pool", label: "Dunkles Hafenbecken", box: [204, 161, 271, 216] },
        { id: "telescope", label: "Defektes Fernrohr", box: [267, 111, 324, 186] },
        { id: "tower", label: "Leuchtturm", box: [326, 26, 384, 172] }
      ]
    },
    tavern: {
      label: "NEBELHAFEN · SCHIEFER ANKER",
      spots: [
        { id: "rope", label: "Schnur an der Wand", box: [12, 79, 68, 150] },
        { id: "patron", label: "Schlafender Seemann", box: [83, 109, 124, 175] },
        { id: "note", label: "Alte Seekarte", box: [116, 71, 166, 118] },
        { id: "barkeep", label: "Käpt'n Mira", box: [215, 81, 275, 181] },
        { id: "door", label: "Zurück zur Mole", box: [329, 69, 384, 195] }
      ]
    },
    tower: {
      label: "NEBELHAFEN · LEUCHTTURM",
      spots: [
        { id: "exit", label: "Zurück zur Mole", box: [0, 68, 66, 207] },
        { id: "window", label: "Fenster zum Meer", box: [143, 20, 205, 94] },
        { id: "lensSlot", label: "Fassung für die Linse", box: [196, 100, 259, 150] },
        { id: "oilTank", label: "Ölbehälter", box: [260, 151, 310, 208] },
        { id: "lever", label: "Hauptschalter", box: [304, 83, 363, 157] }
      ]
    }
  };
  function fresh() {
    return { scene: "pier", verb: "walk", selected: null, items: [],
      flags: { coinFound: false, hookTaken: false, ropeTaken: false, lensTaken: false, keyFished: false,
        oilBought: false, doorOpened: false, lensFitted: false, oilFilled: false, won: false },
      narration: "Der Leuchtturm ist dunkel. Vielleicht kann ich daran etwas ändern." };
  }
  let state = fresh();
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (raw && scenes[raw.scene] && Array.isArray(raw.items) && raw.flags && typeof raw.flags === "object") {
      const base = fresh();
      state = { ...base, ...raw, flags: { ...base.flags, ...raw.flags },
        items: raw.items.filter(k => Object.hasOwn(itemInfo, k)), selected: null, verb: "walk" };
    }
  } catch (_) { /* Optionaler lokaler Spielstand. */ }

  let hovered = null;
  let lastFrame = 0;
  let dialogActive = false;
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (_) { /* Spiel bleibt nutzbar. */ }
  }
  function say(text) { state.narration = text; $("narration").textContent = text; save(); }
  function has(item) { return state.items.includes(item); }
  function add(item) { if (!has(item)) state.items.push(item); renderInventory(); save(); }
  function remove(item) {
    state.items = state.items.filter(v => v !== item);
    if (state.selected === item) state.selected = null;
    renderInventory(); save();
  }
  function goto(scene) {
    state.scene = scene; state.selected = null; state.verb = "walk"; hovered = null;
    $("location").textContent = scenes[scene].label; updateVerbs(); renderInventory();
    if (scene === "pier") say("Salz in der Luft. Und die Uhr tickt. Zum Glück nicht besonders laut.");
    if (scene === "tavern") say("Drinnen riecht es nach Holz, Meer und einem ziemlich alten Eintopf.");
    if (scene === "tower") say("Die Maschine sieht aus, als könnte sie mit ein wenig Hilfe wieder laufen.");
    save();
  }
  function updateVerbs() {
    document.querySelectorAll("[data-verb]").forEach(btn => {
      const active = btn.dataset.verb === state.verb;
      btn.classList.toggle("active", active); btn.setAttribute("aria-pressed", String(active));
    });
    $("selection").textContent = state.selected
      ? itemInfo[state.selected][0] + " ausgewählt: Wähle ein Ziel im Bild oder einen zweiten Gegenstand."
      : "Aktion: " + ({ walk: "Gehe zu", look: "Sieh an", take: "Nimm", use: "Benutze", talk: "Rede mit" }[state.verb]) + ".";
  }
  function renderInventory() {
    const inventory = $("inventory");
    inventory.replaceChildren();
    if (!state.items.length) {
      const blank = document.createElement("span"); blank.className = "empty";
      blank.textContent = "Noch nichts eingesteckt …"; inventory.append(blank);
    }
    state.items.forEach(item => {
      const btn = document.createElement("button");
      btn.type = "button"; btn.textContent = itemInfo[item][1] + " " + itemInfo[item][0];
      btn.classList.toggle("selected", state.selected === item);
      btn.setAttribute("aria-pressed", String(state.selected === item));
      btn.addEventListener("click", () => chooseItem(item));
      inventory.append(btn);
    });
    updateVerbs();
  }
  function chooseItem(item) {
    if (state.selected && state.selected !== item) {
      const pair = [state.selected, item].sort().join("-");
      if (pair === "hook-rope") {
        remove("hook"); remove("rope"); add("rod"); state.selected = "rod"; state.verb = "use";
        say("Mit etwas Geschick wird aus Schnur und Angelhaken eine erstaunlich brauchbare Angel.");
        renderInventory(); return;
      }
      say("Die beiden Dinge passen nicht so recht zusammen.");
    }
    state.selected = state.selected === item ? null : item;
    if (state.selected) state.verb = "use";
    renderInventory(); save();
  }
  function clearSelection() { state.selected = null; renderInventory(); save(); }
  function selectVerb(verb) { state.verb = verb; state.selected = null; updateVerbs(); renderInventory(); save(); }

  function openDialog(title, text, choices) {
    dialogActive = true;
    $("dialogTitle").textContent = title; $("dialogText").textContent = text;
    const list = $("dialogChoices"); list.replaceChildren();
    choices.forEach(choice => {
      const btn = document.createElement("button"); btn.type = "button"; btn.textContent = choice[0];
      btn.addEventListener("click", () => { closeDialog(); choice[1](); }); list.append(btn);
    });
    $("dialog").hidden = false;
    list.querySelector("button")?.focus();
  }
  function closeDialog() { $("dialog").hidden = true; dialogActive = false; canvas.focus({ preventScroll: true }); }
  function speakToMira() {
    openDialog("KÄPT'N MIRA", "Na, Landratte? Du siehst aus, als suchtest du entweder Ärger oder den Leuchtturmwärter.",
      [
        ["Ich brauche Lampenöl für den Leuchtturm.", () => {
          if (state.flags.oilBought) return say("Mira: Du hast mein letztes Öl schon. Pass gut darauf auf.");
          if (has("coin")) {
            remove("coin"); add("oil"); state.flags.oilBought = true;
            say("Mira: Eine Kupfermünze? Na gut. Für den Leuchtturm mache ich eine Ausnahme. Hier ist das Öl.");
          } else say("Mira: Ich habe noch eine Flasche. Für eine Kupfermünze gehört sie dir.");
        }],
        ["Was ist mit dem Leuchtturm passiert?", () =>
          say("Mira: Erst fiel die Linse heraus, dann ging das Öl aus. Und der Schlüssel? Plumps – ins Hafenbecken!")],
        ["Was ist das für eine seltsame Schnur?", () =>
          say("Mira: Die hat ein Seemann vergessen. Wenn du sie brauchst, nimm sie ruhig.")],
        ["Lieber später.", () => say("Mira: Ich bin hier, falls du eine gute Geschichte hören möchtest.")]
      ]
    );
  }
  const descriptions = {
    tavern: "Die Taverne »Zum schiefen Anker«. Hier kennt man jeden. Und alle Geheimnisse.",
    barrel: "Ein vergessener Kramladen in Fassform. Darin klappert etwas.",
    hook: "Ein Angelhaken. Vielleicht nützlich, um etwas aus dem Wasser zu fischen.",
    pool: "Im Wasser glänzt etwas Metallisches. Viel zu tief für meine Finger.",
    telescope: "Das Fernrohr funktioniert nicht mehr. Die lose Messinglinse ist noch ganz gut.",
    tower: "Der Leuchtturm. Seine Tür ist versperrt, sein Licht erloschen.",
    rope: "Eine lange, feste Schnur. Ein Seemann hat sie offenbar vergessen.",
    patron: "Schläft wie ein Stein. Ein Stein, der Schnarchgeräusche macht.",
    note: "Eine Seekarte. Daneben steht: »Ohne Linse kein Licht. Ohne Öl kein Feuer.«",
    barkeep: "Käpt'n Mira. Früher auf hoher See, heute Hüterin des Thekengeheimnisses.",
    door: "Zurück hinaus in die kalte Nacht.",
    exit: "Die Tür zur Mole. Draußen ist es bestimmt immer noch neblig.",
    window: "Von hier oben sieht man den ganzen Hafen. Die Schiffe warten auf Licht.",
    lensSlot: "Der alte Halter hat eine runde Aussparung. Da fehlt die Messinglinse.",
    oilTank: "Ein fast leerer Behälter mit dem Schild: »Nur Lampenöl«.",
    lever: "Ein schwerer Hebel. Daneben steht: »ERST LINSE + ÖL, DANN SCHALTEN«."
  };
  function interact(id) {
    const verb = state.verb;
    const used = state.selected;
    if (id === "tavern" && (verb === "walk" || verb === "use") && !used) return goto("tavern");
    if (id === "door" && (verb === "walk" || verb === "use") && !used) return goto("pier");
    if (id === "exit" && (verb === "walk" || verb === "use") && !used) return goto("pier");
    if (id === "tower" && (verb === "walk" || verb === "use")) {
      if (state.flags.doorOpened || used === "key" || has("key")) {
        state.flags.doorOpened = true;
        if (used === "key") clearSelection();
        return goto("tower");
      }
      return say("Die Tür ist abgeschlossen. Der Schlüssel soll im Hafenbecken liegen …");
    }
    if (verb === "look" || (verb === "walk" && id !== "barkeep")) {
      if (id === "lensSlot" && state.flags.lensFitted) return say("Die Messinglinse sitzt bereits fest in ihrer Fassung.");
      if (id === "oilTank" && state.flags.oilFilled) return say("Der Behälter ist jetzt randvoll mit Lampenöl.");
      return say(descriptions[id]);
    }
    if (verb === "talk" || (id === "barkeep" && !used && verb !== "take")) {
      if (id === "barkeep") return speakToMira();
      if (id === "patron") return say("Der Seemann schnarcht zurück. Ein beeindruckendes Gespräch.");
      return say("Das antwortet nicht. Zumindest nicht in einer Sprache, die ich verstehe.");
    }
    if (verb === "take") {
      if (id === "barrel" && !state.flags.coinFound) {
        state.flags.coinFound = true; add("coin");
        return say("Zwischen nassem Tauwerk liegt eine Kupfermünze. Na bitte!");
      }
      if (id === "hook" && !state.flags.hookTaken) {
        state.flags.hookTaken = true; add("hook"); return say("Ein echter Angelhaken. Hoffentlich ohne Fisch.");
      }
      if (id === "rope" && !state.flags.ropeTaken) {
        state.flags.ropeTaken = true; add("rope"); return say("Die Schnur ist fest und erstaunlich sauber.");
      }
      if (id === "telescope" && !state.flags.lensTaken) {
        state.flags.lensTaken = true; add("lens");
        return say("Die lose Linse lässt sich vorsichtig abschrauben. Passt vielleicht in den Leuchtturm.");
      }
      return say("Das nehme ich lieber nicht mit. Jedenfalls nicht in dieser Hosentasche.");
    }
    if (verb === "use") {
      if (id === "pool") {
        if (used === "rod" && !state.flags.keyFished) {
          state.flags.keyFished = true; remove("rod"); add("key"); clearSelection();
          return say("Ein gezielter Wurf, ein kleiner Ruck … und schon hängt der Turmschlüssel am Haken!");
        }
        if (state.flags.keyFished) return say("Hier gibt es nichts mehr zu angeln. Zum Glück.");
        return say("Dort unten glänzt etwas. Mit bloßen Händen komme ich nicht heran.");
      }
      if (id === "lensSlot") {
        if (used === "lens" && !state.flags.lensFitted) {
          state.flags.lensFitted = true; remove("lens"); clearSelection();
          return say("Klick! Die Messinglinse sitzt wieder genau da, wo sie hingehört.");
        }
        return say(state.flags.lensFitted ? "Die Linse ist schon eingesetzt." : "Hier gehört eine passende Linse hinein.");
      }
      if (id === "oilTank") {
        if (used === "oil" && !state.flags.oilFilled) {
          state.flags.oilFilled = true; remove("oil"); clearSelection();
          return say("Gluck, gluck. Der Ölbehälter ist aufgefüllt. Hoffentlich funktioniert der Rest.");
        }
        return say(state.flags.oilFilled ? "Der Ölbehälter ist voll." : "Hier fehlt offenbar Lampenöl.");
      }
      if (id === "lever") {
        if (state.flags.lensFitted && state.flags.oilFilled) {
          state.flags.won = true; $("ending").hidden = false;
          say("RUMMS! Ein goldener Lichtstrahl durchbricht den Nebel. Nebelhafen ist gerettet!");
          save(); return;
        }
        return say("Der Schalter rührt sich nicht. Erst müssen Linse und Lampenöl eingesetzt sein.");
      }
      if (id === "barkeep") return speakToMira();
      if (id === "telescope" && used === "lens") return say("Die Linse habe ich schon. Die gehört woanders hin.");
      if (used) return say(itemInfo[used][0] + " hilft mir hier vermutlich nicht weiter.");
      return say(descriptions[id]);
    }
  }
  function hint() {
    const f = state.flags;
    if (!f.hookTaken || !f.ropeTaken) return say("TIPP: An der Mole liegt ein Angelhaken. In der Taverne hängt eine brauchbare Schnur.");
    if (!f.keyFished) return say("TIPP: Klicke in der Tasche auf Schnur und Angelhaken, um sie zu verbinden. Wirf die Angel ins Hafenbecken.");
    if (!f.lensTaken) return say("TIPP: Sieh dir das kaputte Fernrohr an der Mole genauer an – oder nimm es auseinander.");
    if (!f.oilBought) return say("TIPP: In einem Fass an der Mole liegt Geld. Rede mit Mira in der Taverne über Lampenöl.");
    if (!f.doorOpened) return say("TIPP: Mit dem Turmschlüssel kannst du nun den Leuchtturm betreten.");
    if (!f.lensFitted) return say("TIPP: Benutze die Messinglinse mit der runden Fassung im Leuchtturm.");
    if (!f.oilFilled) return say("TIPP: Fülle das Lampenöl in den Behälter unten rechts.");
    if (!f.won) return say("TIPP: Jetzt kannst du den großen Hebel betätigen.");
    say("Du hast das Rätsel gelöst. Nebelhafen dankt dir!");
  }

  const stars = [[17,19],[35,44],[76,20],[117,38],[143,12],[192,34],[247,18],[283,55],[362,17],[352,53],[210,22]];
  function r(x,y,w,h,c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x),Math.round(y),w,h); }
  function poly(points,c) { ctx.fillStyle = c; ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();ctx.fill(); }
  function stroke(x,y,w,h,c) { ctx.strokeStyle=c;ctx.lineWidth=1;ctx.strokeRect(Math.round(x)+.5,Math.round(y)+.5,w,h); }
  function ellipse(x,y,rx,ry,c) {ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
  function text(t,x,y,color="#fff0d2",size=8) { ctx.fillStyle=color;ctx.font="bold "+size+"px monospace";ctx.fillText(t,x,y); }
  function bricks(x,y,w,h,c) {
    for(let yy=y+10;yy<y+h;yy+=14)for(let xx=x+((yy-y)/14%2?9:0);xx<x+w-5;xx+=24)r(xx,yy,14,1,c);
  }
  function hero(x,y,t) {
    const bob=Math.floor(t/340)%2;
    r(x+5,y-3,14,5,"#34253e");r(x+7,y-8,10,7,"#d6a35c");r(x+6,y-11,12,3,"#4b3458");
    r(x+8,y-1,9,8,"#d9b694");r(x+14,y+2,2,2,"#24243b");
    r(x+5,y+7,15,17,"#764d57");r(x+18,y+8,6,4,"#cc8953");
    r(x+6,y+11,15,3,"#f4ad79");r(x+6,y+23,6,9-bob,"#35344e");r(x+14,y+23,6,9+bob,"#35344e");
    r(x+3,y+31-bob,10,3,"#251e35");r(x+13,y+31+bob,10,3,"#251e35");
  }
  function sky(t) {
    r(0,0,384,216,"#545b83");r(0,0,384,41,"#353956");r(0,41,384,39,"#465073");
    r(0,80,384,32,"#616b85");
    stars.forEach(([x,y],i)=>r(x,y,(i%3===0?2:1),1,"#dbcebe"));
    ellipse(294,47,18,18,"#e8dab6");ellipse(299,43,17,18,"#545b83");
    poly([[0,116],[34,88],[81,115],[126,95],[166,118],[228,95],[277,117],[326,90],[384,119],[384,147],[0,147]],"#394b66");
    r(0,122,384,94,"#263e59");r(0,135,384,81,"#25445d");
    for(let y=138;y<212;y+=9)for(let x=8+(y*7%21);x<382;x+=41)r(x+Math.sin(t/920+y)*3,y,14,1,y%2?"#41677a":"#54778a");
  }
  function drawPier(t) {
    sky(t);
    // Distant lanterns and tavern on the left
    r(0,93,30,55,"#33364c");r(12,103,9,16,"#e4aa6b");r(12,119,9,3,"#765266");
    r(25,81,82,70,"#664d61");poly([[18,83],[49,58],[84,58],[117,83]],"#332f4c");
    poly([[28,83],[48,66],[84,66],[108,83]],"#a06468");
    bricks(29,88,76,58,"#6f425e");
    r(40,105,19,25,"#2a263e");r(42,107,15,19,"#cd9d69");r(46,113,7,13,"#80657c");
    r(79,104,16,25,"#302d48");r(82,107,10,16,"#c4a06a");
    r(65,86,5,29,"#302b41");r(60,85,23,12,"#ddbd82");text("ANKER",61,94,"#46394a",7);
    r(12,142,125,16,"#282b44");r(16,145,119,3,"#88616b");
    // Lighthouse and island
    poly([[302,147],[314,128],[373,126],[384,150],[384,178],[299,174]],"#252b44");
    r(337,40,31,101,"#a8a5a1");r(333,37,39,9,"#ddd1b2");r(334,46,37,6,"#564a61");
    r(343,51,19,13,"#35384e");r(347,54,11,8,state.flags.won?"#ffe6a0":"#687b8f");
    r(340,64,26,4,"#5e5266");poly([[331,37],[351,21],[373,37]],"#6d4b64");
    r(347,20,9,5,"#d8bb87");r(350,15,3,5,"#c9b886");
    bricks(337,72,31,67,"#827d80");
    r(347,104,11,22,"#292d46");r(346,101,13,4,"#9c8f8c");
    r(330,142,48,10,"#333347");
    if(state.flags.won){poly([[354,54],[384,34],[384,74]],"#f7d88d");poly([[343,54],[270,18],[272,38]],"#cbb777")}
    // Foreground wooden pier in perspective
    poly([[0,168],[181,146],[274,149],[384,183],[384,216],[0,216]],"#815e68");
    poly([[0,172],[183,149],[270,151],[384,186],[384,196],[260,157],[180,156],[0,182]],"#a27872");
    for(let y=181;y<216;y+=13){r(0,y,384,2,"#513f59");r(0,y+3,384,2,"#976f70")}
    for(let x=19;x<384;x+=40){r(x,182,2,34,"#63465c");r(x+5,179,1,32,"#bd8e81")}
    for(let x=9;x<254;x+=47){r(x,149,5,22,"#4f3a52");r(x,149,20,3,"#aa7777")}
    // Barrel with a hidden coin
    ellipse(109,184,17,7,"#3d354f");r(94,166,31,24,"#845c56");ellipse(109,165,15,7,"#ad826e");
    r(94,172,31,3,"#382e45");r(95,183,29,3,"#40344b");r(103,165,3,24,"#bd8974");
    if(!state.flags.coinFound) r(119,169,3,2,"#ffdd86");
    // Water opening near pier
    poly([[204,169],[255,166],[275,197],[248,216],[211,216]],"#25485e");
    poly([[219,180],[254,175],[267,194],[246,211]],"#2e6372");
    r(233,194,8,2,"#74aab3");r(254,201,9,1,"#75b9b8");
    if(!state.flags.keyFished) {r(247,202,5,2,"#f4d07c");r(249,199,2,7,"#f5d187")}
    if(!state.flags.hookTaken){r(170,195,9,2,"#f5cf9b");r(177,197,2,5,"#c7a6aa");r(174,200,4,2,"#c7a6aa")}
    // Telescope
    r(285,128,4,49,"#282d42");r(278,177,4,12,"#3d354c");r(295,177,4,12,"#3d354c");
    poly([[272,127],[303,113],[311,124],[281,139]],"#b89c7b");
    r(270,128,7,9,"#3e435c");r(284,122,3,2,"#fee8b7");
    // Hanging lantern and sailor sprite
    r(10,126,2,38,"#413349");r(6,131,10,13,"#efd19a");r(7,137,8,5,"#c98969");
    hero(146,165,t);
    // Decorative ships
    poly([[180,116],[231,116],[222,127],[193,127]],"#313247");r(207,92,2,23,"#bfa48d");
    poly([[210,96],[209,113],[230,113]],"#b7a5a1");
    text("ZUM SCHIEFEN",19,54,"#f1d4ae",7);
  }
  function drawTavern(t) {
    r(0,0,384,216,"#392c43");r(0,0,384,122,"#704b56");
    for(let x=0;x<384;x+=36)r(x,0,3,151,"#492f45");
    for(let y=18;y<154;y+=18)r(0,y,384,2,"#855867");
    r(0,147,384,69,"#4c3448");
    for(let y=153;y<216;y+=12)r(0,y,384,2,"#815467");
    for(let x=0;x<384;x+=48)r(x,152,2,64,"#7a4b5d");
    // Rope hook
    r(27,59,5,18,"#a58c80");r(29,76,3,35,"#ddbb91");
    if(!state.flags.ropeTaken){
      for(let i=0;i<4;i++)stroke(15+i*4,105-i*3,29-i*8,18+i*2,"#e4c594");
      r(27,102,3,19,"#deb888");
    }
    // Map
    r(113,65,61,52,"#493349");r(118,71,51,40,"#d4b089");
    poly([[122,87],[133,78],[142,87],[158,83],[162,97],[138,105]],"#8c9e83");
    for(let i=0;i<5;i++)r(124+i*8,74,1,34,"#a5827d");
    // Shelf and bottles
    r(174,53,113,6,"#432c43");r(184,25,4,29,"#47334a");r(276,25,4,29,"#47334a");
    for(let i=0;i<9;i++){let x=186+i*10; r(x,32+(i%3)*4,6,20-(i%3)*4,["#5c9090","#ad8972","#84638a"][i%3]);r(x+2,29+(i%3)*4,2,4,"#e2c2a0")}
    r(199,80,91,6,"#46354a");
    // Cozy lantern
    r(182,5,2,23,"#2c2840");r(176,27,14,19,"#efbc70");r(177,29,12,12,"#f7d28c");
    // Sleepy sailor
    r(91,126,20,32,"#3b4757");r(89,111,24,18,"#9c6967");r(85,108,33,5,"#314159");
    r(99,116,5,2,"#2c243f");r(103,116,4,2,"#2c243f");
    text("Z",86,100,"#e9d5b4",10);text("z",94,91,"#e9d5b4",8);
    // Counter
    r(183,142,129,56,"#554055");r(182,138,131,10,"#bd866e");r(182,155,129,5,"#795465");
    for(let x=191;x<307;x+=27)r(x,161,3,37,"#81596a");
    // Mira behind counter
    r(227,105,23,43,"#49747c");r(229,92,20,24,"#d8ae88");r(229,88,22,8,"#2f344b");
    poly([[222,88],[240,78],[255,88]],"#242c42");
    r(230,100,3,2,"#303248");r(242,100,3,2,"#303248");
    r(233,108,13,3,"#8e5c61");r(220,132,11,5,"#d1aa8d");
    r(255,149,11,12,"#ddd0a7");r(258,146,5,4,"#f4ddb2");
    // Door to outside
    r(330,64,54,132,"#352b45");r(339,81,35,111,"#4f455b");
    r(344,91,24,92,"#2c2f44");r(347,94,18,77,"#5a7280");
    ellipse(365,138,2,2,"#f0cc8b");text("MOLE →",334,58,"#f7d5a7",8);
    hero(135,173,t);r(0,196,384,20,"#3b2b42");
  }
  function drawTower(t) {
    r(0,0,384,216,"#454761");r(0,0,384,37,"#2c3149");
    r(11,0,9,216,"#636071");r(375,0,9,216,"#35354e");
    bricks(22,34,352,169,"#686074");
    poly([[0,191],[384,190],[384,216],[0,216]],"#50475b");
    for(let x=0;x<384;x+=39)r(x,195,2,21,"#3c384e");
    // door and stone arch
    r(8,82,60,113,"#2d2c46");poly([[8,86],[15,71],[58,71],[68,88]],"#999085");
    r(15,89,44,103,"#42394c");r(20,98,34,91,"#67505e");
    r(45,135,3,4,"#dbb77a");text("← MOLE",8,63,"#ebcba0");
    // sea window and moon glow
    r(139,13,72,91,"#9a8c8b");r(147,23,57,69,"#2b4763");
    r(147,23,57,26,"#384968");ellipse(176,39,10,10,"#e6d7b4");
    r(147,65,57,27,"#2e576e");r(174,23,4,69,"#a9a0a0");
    r(143,98,63,6,"#726a78");
    // Machine structure
    r(195,143,113,8,"#403c55");r(205,150,14,39,"#7e7276");r(292,150,12,39,"#7e7276");
    r(223,107,56,44,"#ae876e");r(228,110,46,38,"#604b62");
    ellipse(248,128,25,27,"#9a7d70");ellipse(248,128,19,22,"#d2b686");
    ellipse(248,128,15,17,state.flags.lensFitted?"#a5d8cd":"#5d617c");
    if(state.flags.lensFitted){ellipse(248,128,8,10,"#d6eee4");r(238,120,6,2,"#fcf5df")}
    r(224,139,49,5,"#5c4a5f");
    r(272,139,18,7,"#a18a7f");
    // Gear
    ellipse(193,158,19,19,"#bb9074");ellipse(193,158,13,13,"#5c5263");ellipse(193,158,5,5,"#d8aa85");
    for(let i=0;i<8;i++){const a=i*Math.PI/4;r(190+Math.cos(a)*20,155+Math.sin(a)*20,7,5,"#b7927a")}
    // Tank
    r(273,165,32,32,"#b29b8a");r(276,168,26,25,state.flags.oilFilled?"#a98c57":"#5f616d");
    r(272,160,34,7,"#d6b08b");r(277,174,5,5,"#dfbd86");
    r(287,175,3,11,"#433e51");
    text(state.flags.oilFilled?"VOLL":"LEER",274,206,"#f4ce9c",7);
    // Switch
    r(319,102,35,44,"#b3977d");r(324,107,25,34,"#4c4053");
    r(332,113,8,20,"#a58a80");
    poly([[332,116],[337,114],[347,state.flags.won?124:93],[342,state.flags.won?127:94]],"#e2b67b");
    r(342,state.flags.won?122:92,7,7,"#f4d092");
    text("LICHT",319,158,"#d9c4aa",7);
    // Beam when working
    if(state.flags.won){poly([[170,33],[0,0],[0,30]],"#e9d08e");poly([[186,35],[384,0],[384,40]],"#e5c780");}
    r(82,164,16,28,"#463e54");r(86,159,8,8,"#887984");
    hero(97,172,t);
    // Lamp cables
    r(267,106,65,2,"#575065");r(297,107,3,56,"#726778");
    r(196,193,111,4,"#786775");
  }

  function draw(t) {
    ctx.clearRect(0,0,384,216);
    if (state.scene === "pier") drawPier(t);
    else if (state.scene === "tavern") drawTavern(t);
    else drawTower(t);
    if (hovered && !dialogActive) {
      const spot = scenes[state.scene].spots.find(s=>s.id === hovered);
      if (spot) {
        const [x1,y1,x2,y2] = spot.box;
        ctx.strokeStyle="#ffe3a1";ctx.lineWidth=1;ctx.setLineDash([4,3]);
        ctx.strokeRect(x1+.5,y1+.5,x2-x1,y2-y1);
        ctx.setLineDash([]);
        const label = spot.label;
        ctx.font="bold 8px monospace";
        const w=Math.min(374,ctx.measureText(label).width+13);
        const bx=Math.max(4,Math.min(380-w,x1));
        const by=Math.max(14,y1-5);
        r(bx,by-13,w,13,"#242238");stroke(bx,by-13,w,13,"#d6b487");
        text(label,bx+6,by-4,"#fbe6bc",8);
      }
    }
  }
  function spotAt(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * 384 / rect.width;
    const y = (e.clientY - rect.top) * 216 / rect.height;
    // smaller overlapping objects are listed before larger navigation areas
    return scenes[state.scene].spots.find(s => x >= s.box[0] && y >= s.box[1] && x <= s.box[2] && y <= s.box[3]);
  }
  canvas.addEventListener("pointermove", e => { hovered = spotAt(e)?.id || null;canvas.style.cursor = hovered ? "pointer" : "crosshair"; });
  canvas.addEventListener("pointerleave", () => {hovered=null;});
  canvas.addEventListener("click", e => {if(!dialogActive && !state.flags.won){const spot=spotAt(e);if(spot)interact(spot.id);else say("Hier scheint nichts Besonderes zu sein.");}});
  document.querySelectorAll("[data-verb]").forEach(btn=>btn.addEventListener("click",()=>selectVerb(btn.dataset.verb)));
  $("hintBtn").addEventListener("click",hint);
  $("resetBtn").addEventListener("click", () => { if(confirm("Möchtest du wirklich von vorne beginnen? Dein Spielstand wird gelöscht.")) reset(); });
  $("playAgain").addEventListener("click",reset);
  function reset(){state=fresh();hovered=null;clearSelection();goto("pier");$("ending").hidden=true;say("Ein neuer Abend in Nebelhafen. Diesmal klappt es bestimmt!");}
  $("helpBtn").addEventListener("click",()=>{ $("helpModal").hidden=false;$("closeHelp").focus(); });
  $("closeHelp").addEventListener("click",()=>{ $("helpModal").hidden=true;canvas.focus({preventScroll:true}); });
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"){if(!$("helpModal").hidden){$("helpModal").hidden=true;return;}if(dialogActive){closeDialog();return;}clearSelection();return;}
    if(dialogActive || !$("helpModal").hidden || e.ctrlKey || e.altKey || e.metaKey)return;
    if(e.key>="1" && e.key<="5"){selectVerb(["walk","look","take","use","talk"][Number(e.key)-1]);}
    if(e.key.toLowerCase()==="h")hint();
  });
  function tick(now){if(now-lastFrame>55){draw(now);lastFrame=now;}requestAnimationFrame(tick);}
  $("location").textContent=scenes[state.scene].label;
  $("narration").textContent=state.narration;
  $("ending").hidden=!state.flags.won;
  renderInventory();
  requestAnimationFrame(tick);
})();