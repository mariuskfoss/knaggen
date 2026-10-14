/* Ukeshandel v0.3 – bakgrunnsbibliotek: norske hverdagsretter (statisk, ingen nettoppslag).
 * Vises som forslag øverst i Retter. «Legg til» kopierer retten inn i våre retter (id «lib-<id>»).
 * Format som seed.js: ingredienser er [navn, mengde, enhet, avdeling]. Enheter og avdelinger må finnes i appen.
 */
(function () {
  var FG = 'Frukt/grønt', KJ = 'Kjøl', FR = 'Frys', TV = 'Tørrvare', HU = 'Hus';

  var L = [
    { id: 'bergensk-fiskesuppe', name: 'Bergensk fiskesuppe', minutes: 40, servings: 4, ingredients: [
      ['torskefilet', 400, 'g', KJ], ['laksefilet', 200, 'g', KJ], ['gulrot', 2, 'stk', FG], ['purre', 1, 'stk', FG],
      ['sellerirot', 0.5, 'stk', FG], ['fiskebuljong', 1, 'l', TV], ['melk', 3, 'dl', KJ], ['matfløte', 2, 'dl', KJ],
      ['hvetemel', 0.5, 'dl', TV], ['smør', 2, 'ss', KJ], ['gressløk', 1, 'bunt', FG]]},
    { id: 'kjottsuppe', name: 'Kjøttsuppe', minutes: 120, note: 'God dagen derpå – lag mye', servings: 8, ingredients: [
      ['høyrygg av storfe', 800, 'g', KJ], ['gulrot', 4, 'stk', FG], ['kålrot', 0.5, 'stk', FG], ['sellerirot', 0.5, 'stk', FG],
      ['purre', 1, 'stk', FG], ['poteter', 600, 'g', FG], ['salt', 1, 'ss', TV], ['pepper', 1, 'ts', TV]]},
    { id: 'lapskaus', name: 'Lapskaus', minutes: 60, servings: 4, ingredients: [
      ['svinekjøtt i terninger', 500, 'g', KJ], ['poteter', 800, 'g', FG], ['gulrot', 3, 'stk', FG], ['kålrot', 0.5, 'stk', FG],
      ['løk', 2, 'stk', FG], ['kjøttbuljong', 1, 'l', TV], ['flatbrød', 1, 'pk', TV]]},
    { id: 'farikal', name: 'Fårikål', minutes: 150, note: 'Høstklassiker', servings: 8, ingredients: [
      ['fårikålkjøtt', 1.5, 'kg', KJ], ['hodekål', 1.5, 'kg', FG], ['hel sort pepper', 2, 'ss', TV], ['hvetemel', 2, 'ss', TV],
      ['salt', 1, 'ss', TV], ['poteter', 1, 'kg', FG]]},
    { id: 'ovnskylling-rotgronnsaker', name: 'Ovnsbakt kylling med rotgrønnsaker', minutes: 60, servings: 6, ingredients: [
      ['kyllinglår', 1, 'kg', KJ], ['poteter', 600, 'g', FG], ['gulrot', 3, 'stk', FG], ['pastinakk', 2, 'stk', FG],
      ['rødløk', 2, 'stk', FG], ['olivenolje', 3, 'ss', TV], ['rosmarin', 1, 'pk', FG], ['hvitløk', 4, 'fedd', FG]]},
    { id: 'karbonader', name: 'Karbonader med løk og poteter', minutes: 40, servings: 4, ingredients: [
      ['karbonadedeig', 600, 'g', KJ], ['løk', 2, 'stk', FG], ['poteter', 800, 'g', FG], ['brun saus', 1, 'pk', TV],
      ['erter', 1, 'pk', FR], ['smør', 2, 'ss', KJ]]},
    { id: 'medisterkaker', name: 'Medisterkaker med surkål', minutes: 40, servings: 4, ingredients: [
      ['medisterkaker', 600, 'g', KJ], ['surkål', 1, 'pk', KJ], ['poteter', 800, 'g', FG], ['brun saus', 1, 'pk', TV],
      ['tyttebærsyltetøy', 1, 'glass', TV]]},
    { id: 'raspeballer', name: 'Raspeballer med sideflesk', minutes: 90, note: 'Rester kan stekes neste dag', servings: 6, ingredients: [
      ['poteter', 1.5, 'kg', FG], ['byggmel', 3, 'dl', TV], ['hvetemel', 1, 'dl', TV], ['sideflesk', 600, 'g', KJ],
      ['pinnekjøttpølse', 1, 'pk', KJ], ['kålrot', 1, 'stk', FG], ['smør', 3, 'ss', KJ], ['salt', 1, 'ss', TV]]},
    { id: 'plukkfisk', name: 'Plukkfisk', minutes: 40, servings: 4, ingredients: [
      ['torskefilet', 500, 'g', FR], ['poteter', 600, 'g', FG], ['melk', 4, 'dl', KJ], ['hvetemel', 0.5, 'dl', TV],
      ['smør', 2, 'ss', KJ], ['bacon', 1, 'pk', KJ], ['gressløk', 1, 'bunt', FG], ['flatbrød', 1, 'pk', TV]]},
    { id: 'kokt-torsk', name: 'Kokt torsk med gulrøtter', minutes: 30, servings: 4, ingredients: [
      ['torskeloins', 600, 'g', KJ], ['poteter', 800, 'g', FG], ['gulrot', 4, 'stk', FG], ['smør', 100, 'g', KJ],
      ['sitron', 1, 'stk', FG], ['persille', 1, 'bunt', FG]]},
    { id: 'seibiff', name: 'Seibiff med løk', minutes: 30, servings: 4, ingredients: [
      ['seifilet', 600, 'g', KJ], ['løk', 3, 'stk', FG], ['hvetemel', 0.5, 'dl', TV], ['smør', 3, 'ss', KJ],
      ['poteter', 800, 'g', FG], ['gulrot', 3, 'stk', FG]]},
    { id: 'stekt-makrell', name: 'Stekt makrell med agurksalat', minutes: 30, servings: 4, ingredients: [
      ['makrellfilet', 600, 'g', KJ], ['poteter', 800, 'g', FG], ['agurk', 1, 'stk', FG], ['eddik', 2, 'ss', TV],
      ['sukker', 1, 'ss', TV], ['rømme', 1, 'beger', KJ], ['smør', 2, 'ss', KJ]]},
    { id: 'teriyakilaks', name: 'Teriyakilaks med ris', minutes: 25, servings: 4, ingredients: [
      ['laksefilet', 600, 'g', KJ], ['teriyakisaus', 1, 'flaske', TV], ['ris', 4, 'dl', TV], ['brokkoli', 1, 'stk', FG],
      ['sukkererter', 200, 'g', FG], ['sesamfrø', 1, 'ss', TV]]},
    { id: 'fiskeboller', name: 'Fiskeboller i hvit saus', minutes: 30, servings: 4, ingredients: [
      ['fiskeboller', 2, 'boks', TV], ['poteter', 800, 'g', FG], ['gulrot', 4, 'stk', FG], ['karri', 1, 'ts', TV],
      ['smør', 2, 'ss', KJ], ['hvetemel', 0.5, 'dl', TV]]},
    { id: 'fiskepinner', name: 'Fiskepinner med potetmos', minutes: 25, servings: 4, ingredients: [
      ['fiskepinner', 1, 'pk', FR], ['poteter', 800, 'g', FG], ['melk', 2, 'dl', KJ], ['smør', 2, 'ss', KJ],
      ['erter', 1, 'pk', FR], ['remulade', 1, 'beger', KJ]]},
    { id: 'pytt-i-panne', name: 'Pytt i panne', minutes: 25, note: 'Fin for rester', servings: 4, ingredients: [
      ['poteter', 800, 'g', FG], ['pølser', 1, 'pk', KJ], ['løk', 2, 'stk', FG], ['paprika', 1, 'stk', FG],
      ['egg', 4, 'stk', KJ], ['rødbeter', 1, 'glass', TV], ['smør', 2, 'ss', KJ]]},
    { id: 'tacopai', name: 'Tacopai', minutes: 50, servings: 4, ingredients: [
      ['kjøttdeig', 400, 'g', KJ], ['tacokrydder', 1, 'pk', TV], ['butterdeig', 1, 'pk', FR], ['rømme', 1, 'beger', KJ],
      ['egg', 2, 'stk', KJ], ['revet ost', 1, 'pk', KJ], ['paprika', 1, 'stk', FG], ['mais', 1, 'boks', TV]]},
    { id: 'hjemmelaget-pizza', name: 'Hjemmelaget pizza', minutes: 60, servings: 4, ingredients: [
      ['hvetemel', 6, 'dl', TV], ['tørrgjær', 1, 'pk', TV], ['olivenolje', 2, 'ss', TV], ['pizzasaus', 1, 'glass', TV],
      ['revet ost', 2, 'pk', KJ], ['skinke', 1, 'pk', KJ], ['champignon', 250, 'g', FG], ['paprika', 1, 'stk', FG]]},
    { id: 'hamburgere', name: 'Hamburgere', minutes: 30, servings: 4, ingredients: [
      ['kjøttdeig', 600, 'g', KJ], ['hamburgerbrød', 1, 'pk', TV], ['isbergsalat', 1, 'stk', FG], ['tomat', 2, 'stk', FG],
      ['rødløk', 1, 'stk', FG], ['cheddar i skiver', 1, 'pk', KJ], ['hamburgerdressing', 1, 'flaske', TV], ['pommes frites', 1, 'pk', FR]]},
    { id: 'carbonara', name: 'Spaghetti carbonara', minutes: 25, servings: 4, ingredients: [
      ['spaghetti', 400, 'g', TV], ['bacon', 2, 'pk', KJ], ['egg', 4, 'stk', KJ], ['parmesan', 1, 'stk', KJ],
      ['hvitløk', 2, 'fedd', FG], ['pepper', 1, 'ts', TV]]},
    { id: 'polsegryte', name: 'Pølsegryte', minutes: 30, servings: 4, ingredients: [
      ['wienerpølser', 1, 'pk', KJ], ['løk', 1, 'stk', FG], ['paprika', 2, 'stk', FG], ['knuste tomater', 2, 'boks', TV],
      ['matfløte', 2, 'dl', KJ], ['paprikapulver', 1, 'ss', TV], ['ris', 4, 'dl', TV]]},
    { id: 'chili-con-carne', name: 'Chili con carne', minutes: 45, servings: 4, ingredients: [
      ['kjøttdeig', 500, 'g', KJ], ['løk', 1, 'stk', FG], ['hvitløk', 3, 'fedd', FG], ['kidneybønner', 2, 'boks', TV],
      ['knuste tomater', 2, 'boks', TV], ['chilipulver', 2, 'ts', TV], ['spisskummen', 1, 'ts', TV], ['ris', 4, 'dl', TV],
      ['rømme', 1, 'beger', KJ]]},
    { id: 'tikka-masala', name: 'Kylling tikka masala', minutes: 40, servings: 4, ingredients: [
      ['kyllingfilet', 600, 'g', KJ], ['tikka masala-saus', 1, 'glass', TV], ['løk', 1, 'stk', FG], ['matfløte', 2, 'dl', KJ],
      ['basmatiris', 4, 'dl', TV], ['naanbrød', 1, 'pk', TV], ['koriander', 1, 'pk', FG]]},
    { id: 'vegetarlasagne', name: 'Vegetarlasagne', minutes: 70, servings: 4, ingredients: [
      ['squash', 1, 'stk', FG], ['aubergine', 1, 'stk', FG], ['paprika', 2, 'stk', FG], ['løk', 1, 'stk', FG],
      ['knuste tomater', 2, 'boks', TV], ['lasagneplater', 1, 'pk', TV], ['cottage cheese', 1, 'beger', KJ],
      ['revet ost', 1, 'pk', KJ], ['spinat', 1, 'pk', FR]]},
    { id: 'linsesuppe', name: 'Linsesuppe', minutes: 35, servings: 4, ingredients: [
      ['røde linser', 3, 'dl', TV], ['løk', 1, 'stk', FG], ['gulrot', 2, 'stk', FG], ['hvitløk', 2, 'fedd', FG],
      ['knuste tomater', 1, 'boks', TV], ['kokosmelk', 1, 'boks', TV], ['grønnsaksbuljong', 1, 'l', TV], ['karri', 2, 'ts', TV]]},
    { id: 'gul-ertesuppe', name: 'Gul ertesuppe med flesk', minutes: 90, note: 'Legg ertene i bløt kvelden før', servings: 4, ingredients: [
      ['gule erter', 500, 'g', TV], ['sideflesk', 400, 'g', KJ], ['løk', 1, 'stk', FG], ['gulrot', 2, 'stk', FG],
      ['kålrot', 0.5, 'stk', FG], ['timian', 1, 'ts', TV]]},
    { id: 'blomkalsuppe', name: 'Blomkålsuppe', minutes: 30, servings: 4, ingredients: [
      ['blomkål', 1, 'stk', FG], ['løk', 1, 'stk', FG], ['poteter', 300, 'g', FG], ['grønnsaksbuljong', 1, 'l', TV],
      ['matfløte', 2, 'dl', KJ], ['bacon', 1, 'pk', KJ], ['brød', 1, 'stk', TV]]},
    { id: 'soppristotto', name: 'Sopprisotto', minutes: 40, servings: 4, ingredients: [
      ['risottoris', 4, 'dl', TV], ['champignon', 400, 'g', FG], ['sjalottløk', 2, 'stk', FG], ['hvitløk', 2, 'fedd', FG],
      ['grønnsaksbuljong', 1, 'l', TV], ['parmesan', 1, 'stk', KJ], ['smør', 2, 'ss', KJ]]},
    { id: 'pasta-pesto-kylling', name: 'Pasta pesto med kylling', minutes: 25, servings: 4, ingredients: [
      ['penne', 400, 'g', TV], ['kyllingfilet', 400, 'g', KJ], ['grønn pesto', 1, 'glass', TV], ['cherrytomater', 250, 'g', FG],
      ['ruccola', 1, 'pk', FG], ['parmesan', 1, 'stk', KJ]]},
    { id: 'kremet-laksepasta', name: 'Kremet laksepasta', minutes: 25, servings: 4, ingredients: [
      ['tagliatelle', 400, 'g', TV], ['laksefilet', 400, 'g', KJ], ['matfløte', 3, 'dl', KJ], ['spinat', 1, 'pk', FR],
      ['sitron', 1, 'stk', FG], ['hvitløk', 2, 'fedd', FG], ['parmesan', 1, 'stk', KJ]]},
    { id: 'ovnsomelett', name: 'Ovnsomelett', minutes: 35, servings: 4, ingredients: [
      ['egg', 8, 'stk', KJ], ['melk', 2, 'dl', KJ], ['skinke', 1, 'pk', KJ], ['paprika', 1, 'stk', FG],
      ['vårløk', 1, 'bunt', FG], ['revet ost', 1, 'pk', KJ], ['brød', 1, 'stk', TV]]},
    { id: 'svinekoteletter', name: 'Svinekoteletter med poteter', minutes: 35, servings: 4, ingredients: [
      ['svinekoteletter', 4, 'stk', KJ], ['poteter', 800, 'g', FG], ['brokkoli', 1, 'stk', FG], ['løk', 1, 'stk', FG],
      ['brun saus', 1, 'pk', TV], ['smør', 2, 'ss', KJ]]},
    { id: 'svinefilet-soppsaus', name: 'Svinefilet med soppsaus', minutes: 40, servings: 4, ingredients: [
      ['svinefilet', 600, 'g', KJ], ['champignon', 250, 'g', FG], ['matfløte', 3, 'dl', KJ], ['kjøttbuljong', 1, 'ts', TV],
      ['poteter', 800, 'g', FG], ['aspargesbønner', 200, 'g', FG]]},
    { id: 'kyllinglar-ris', name: 'Kyllinglår med ris', minutes: 50, servings: 6, ingredients: [
      ['kyllinglår', 1, 'kg', KJ], ['ris', 4, 'dl', TV], ['paprikapulver', 1, 'ss', TV], ['hvitløk', 3, 'fedd', FG],
      ['maiskolber', 4, 'stk', FR], ['rømme', 1, 'beger', KJ]]},
    { id: 'stroganoff', name: 'Stroganoff med ris', minutes: 35, servings: 4, ingredients: [
      ['storfekjøtt i strimler', 500, 'g', KJ], ['løk', 1, 'stk', FG], ['champignon', 250, 'g', FG], ['paprikapulver', 1, 'ss', TV],
      ['tomatpuré', 2, 'ss', TV], ['matfløte', 3, 'dl', KJ], ['ris', 4, 'dl', TV], ['sylteagurk', 1, 'glass', TV]]},
    { id: 'kalruletter', name: 'Kålruletter', minutes: 60, servings: 4, ingredients: [
      ['hodekål', 1, 'stk', FG], ['kjøttdeig', 500, 'g', KJ], ['løk', 1, 'stk', FG], ['egg', 1, 'stk', KJ],
      ['melk', 1, 'dl', KJ], ['poteter', 800, 'g', FG], ['smør', 2, 'ss', KJ], ['hvetemel', 0.5, 'dl', TV]]},
    { id: 'fiskegryte', name: 'Fiskegryte', minutes: 35, servings: 4, ingredients: [
      ['torskefilet', 400, 'g', FR], ['reker', 200, 'g', FR], ['løk', 1, 'stk', FG], ['paprika', 1, 'stk', FG],
      ['kokosmelk', 1, 'boks', TV], ['rød karripasta', 1, 'ss', TV], ['limejuice', 1, 'ss', TV], ['ris', 4, 'dl', TV]]},
    { id: 'ovnstorsk-bacon', name: 'Ovnsbakt torsk med bacon', minutes: 35, servings: 6, ingredients: [
      ['torskeloins', 600, 'g', KJ], ['bacon', 1, 'pk', KJ], ['poteter', 800, 'g', FG], ['gulrot', 3, 'stk', FG],
      ['ertebelger', 200, 'g', FG], ['smør', 100, 'g', KJ]]},
    { id: 'schnitzel', name: 'Schnitzel med poteter', minutes: 35, servings: 4, ingredients: [
      ['svineschnitzel', 4, 'stk', KJ], ['egg', 1, 'stk', KJ], ['griljermel', 2, 'dl', TV], ['hvetemel', 0.5, 'dl', TV],
      ['poteter', 800, 'g', FG], ['sitron', 1, 'stk', FG], ['erter', 1, 'pk', FR], ['smør', 3, 'ss', KJ]]},
    { id: 'kyllingnuggets', name: 'Hjemmelagde kyllingnuggets', minutes: 35, servings: 4, ingredients: [
      ['kyllingfilet', 600, 'g', KJ], ['egg', 2, 'stk', KJ], ['cornflakes', 3, 'dl', TV], ['hvetemel', 0.5, 'dl', TV],
      ['søtpotet', 2, 'stk', FG], ['agurk', 1, 'stk', FG], ['ketchup', 1, 'flaske', TV]]},
    { id: 'risgrot', name: 'Risgrøt', minutes: 60, note: 'Rester blir riskrem', servings: 4, ingredients: [
      ['grøtris', 3, 'dl', TV], ['helmelk', 1.5, 'l', KJ], ['smør', 2, 'ss', KJ], ['sukker', 2, 'ss', TV],
      ['kanel', 1, 'ts', TV], ['saft', 1, 'flaske', TV]]},
    { id: 'kyllingenchiladas', name: 'Kyllingenchiladas', minutes: 45, servings: 4, ingredients: [
      ['kyllingfilet', 500, 'g', KJ], ['tortillalefser', 1, 'pk', TV], ['salsa', 1, 'glass', TV], ['sorte bønner', 1, 'boks', TV],
      ['mais', 1, 'boks', TV], ['revet ost', 1, 'pk', KJ], ['rømme', 1, 'beger', KJ], ['avokado', 2, 'stk', FG]]},
    { id: 'quesadilla', name: 'Quesadilla med kylling', minutes: 25, servings: 4, ingredients: [
      ['kyllingfilet', 400, 'g', KJ], ['tortillalefser', 1, 'pk', TV], ['revet ost', 1, 'pk', KJ], ['paprika', 1, 'stk', FG],
      ['vårløk', 1, 'bunt', FG], ['salsa', 1, 'glass', TV], ['rømme', 1, 'beger', KJ]]},
    { id: 'biffwok', name: 'Biffwok med nudler', minutes: 25, servings: 4, ingredients: [
      ['storfekjøtt i strimler', 400, 'g', KJ], ['eggnudler', 250, 'g', TV], ['wokgrønnsaker', 1, 'pk', FR],
      ['hvitløk', 2, 'fedd', FG], ['ingefær', 1, 'stk', FG], ['soyasaus', 3, 'ss', TV], ['østerssaus', 2, 'ss', TV]]},
    { id: 'nudelsuppe', name: 'Nudelsuppe med kylling', minutes: 30, servings: 4, ingredients: [
      ['kyllingfilet', 400, 'g', KJ], ['risnudler', 200, 'g', TV], ['kyllingbuljong', 1, 'l', TV], ['gulrot', 2, 'stk', FG],
      ['pak choi', 2, 'stk', FG], ['vårløk', 1, 'bunt', FG], ['soyasaus', 2, 'ss', TV], ['ingefær', 1, 'stk', FG]]},
    { id: 'kyllingfajitas', name: 'Kyllingfajitas', minutes: 30, servings: 4, ingredients: [
      ['kyllingfilet', 500, 'g', KJ], ['fajitaskrydder', 1, 'pk', TV], ['tortillalefser', 1, 'pk', TV], ['paprika', 2, 'stk', FG],
      ['rødløk', 1, 'stk', FG], ['guacamole', 1, 'beger', KJ], ['rømme', 1, 'beger', KJ]]},
    { id: 'kjottboller-tomatsaus', name: 'Kjøttboller i tomatsaus', minutes: 40, servings: 4, ingredients: [
      ['kjøttdeig', 500, 'g', KJ], ['egg', 1, 'stk', KJ], ['griljermel', 0.5, 'dl', TV], ['løk', 1, 'stk', FG],
      ['tomatsaus', 1, 'glass', TV], ['spaghetti', 400, 'g', TV], ['parmesan', 1, 'stk', KJ], ['basilikum', 1, 'pk', FG]]},
    { id: 'ovnspasta-skinke', name: 'Ovnsbakt pasta med skinke', minutes: 40, servings: 4, ingredients: [
      ['makaroni', 400, 'g', TV], ['kokt skinke', 200, 'g', KJ], ['brokkoli', 1, 'stk', FG], ['melk', 5, 'dl', KJ],
      ['hvetemel', 0.5, 'dl', TV], ['smør', 2, 'ss', KJ], ['revet ost', 1, 'pk', KJ]]},
    { id: 'sursot-svin', name: 'Sursøt svin med ris', minutes: 35, servings: 4, ingredients: [
      ['svinekjøtt i strimler', 500, 'g', KJ], ['sursøt saus', 1, 'glass', TV], ['paprika', 2, 'stk', FG], ['løk', 1, 'stk', FG],
      ['ananas i biter', 1, 'boks', TV], ['ris', 4, 'dl', TV]]},
    { id: 'grillspyd-kylling', name: 'Grillspyd med kylling', minutes: 40, servings: 4, ingredients: [
      ['kyllingfilet', 600, 'g', KJ], ['paprika', 2, 'stk', FG], ['squash', 1, 'stk', FG], ['rødløk', 2, 'stk', FG],
      ['grillspyd', 1, 'pk', HU], ['tzatziki', 1, 'beger', KJ], ['pitabrød', 1, 'pk', TV]]},
    { id: 'stekt-sild', name: 'Stekt sild med løk', minutes: 30, servings: 4, ingredients: [
      ['sildefilet', 600, 'g', KJ], ['løk', 2, 'stk', FG], ['havregryn', 1, 'dl', TV], ['smør', 3, 'ss', KJ],
      ['poteter', 800, 'g', FG], ['rødbeter', 1, 'glass', TV]]},
    { id: 'bacalao', name: 'Bacalao', minutes: 90, note: 'Klippfisken må vannes ut 1–2 døgn på forhånd', servings: 4, ingredients: [
      ['klippfisk', 800, 'g', KJ], ['poteter', 800, 'g', FG], ['løk', 2, 'stk', FG], ['hvitløk', 4, 'fedd', FG],
      ['hermetiske tomater', 2, 'boks', TV], ['paprika', 2, 'stk', FG], ['olivenolje', 1, 'dl', TV], ['oliven', 1, 'glass', TV]]},
    { id: 'kikertgryte', name: 'Kikertgryte', minutes: 35, servings: 4, ingredients: [
      ['kikerter', 2, 'boks', TV], ['løk', 1, 'stk', FG], ['hvitløk', 2, 'fedd', FG], ['søtpotet', 1, 'stk', FG],
      ['kokosmelk', 1, 'boks', TV], ['knuste tomater', 1, 'boks', TV], ['karri', 2, 'ts', TV], ['spinat', 1, 'pk', FR],
      ['ris', 4, 'dl', TV]]},
    { id: 'falafel-pita', name: 'Falafel i pita', minutes: 30, servings: 4, ingredients: [
      ['falafel', 1, 'pk', FR], ['pitabrød', 1, 'pk', TV], ['hummus', 1, 'beger', KJ], ['isbergsalat', 1, 'stk', FG],
      ['tomat', 2, 'stk', FG], ['agurk', 1, 'stk', FG], ['yoghurt naturell', 1, 'beger', KJ]]},
    { id: 'halloumi-ovnsgronnsaker', name: 'Ovnsbakte grønnsaker med halloumi', minutes: 40, servings: 4, ingredients: [
      ['halloumi', 2, 'pk', KJ], ['søtpotet', 2, 'stk', FG], ['rødløk', 2, 'stk', FG], ['paprika', 2, 'stk', FG],
      ['squash', 1, 'stk', FG], ['olivenolje', 3, 'ss', TV], ['couscous', 3, 'dl', TV]]},
    { id: 'potet-purresuppe', name: 'Potet- og purresuppe', minutes: 35, servings: 4, ingredients: [
      ['poteter', 600, 'g', FG], ['purre', 2, 'stk', FG], ['løk', 1, 'stk', FG], ['grønnsaksbuljong', 1, 'l', TV],
      ['matfløte', 2, 'dl', KJ], ['bacon', 1, 'pk', KJ], ['brød', 1, 'stk', TV]]},
    { id: 'fiskeburger', name: 'Fiskeburger', minutes: 25, servings: 4, ingredients: [
      ['fiskeburgere', 1, 'pk', FR], ['hamburgerbrød', 1, 'pk', TV], ['isbergsalat', 1, 'stk', FG], ['tomat', 2, 'stk', FG],
      ['rødløk', 1, 'stk', FG], ['remulade', 1, 'beger', KJ], ['pommes frites', 1, 'pk', FR]]},
    { id: 'reker-loff', name: 'Reker med loff', minutes: 15, note: 'Fredagskos om sommeren', servings: 4, ingredients: [
      ['reker med skall', 1, 'kg', KJ], ['loff', 1, 'stk', TV], ['majones', 1, 'flaske', TV], ['sitron', 2, 'stk', FG],
      ['dill', 1, 'pk', FG], ['smør', 1, 'pk', KJ]]},
    { id: 'kyllingform-brokkoli', name: 'Kyllingform med brokkoli', minutes: 45, servings: 4, ingredients: [
      ['kyllingfilet', 500, 'g', KJ], ['brokkoli', 1, 'stk', FG], ['matfløte', 3, 'dl', KJ], ['revet ost', 1, 'pk', KJ],
      ['karri', 1, 'ts', TV], ['ris', 4, 'dl', TV]]},
    { id: 'gulasjsuppe', name: 'Gulasjsuppe', minutes: 60, servings: 4, ingredients: [
      ['storfekjøtt i terninger', 500, 'g', KJ], ['løk', 2, 'stk', FG], ['paprika', 2, 'stk', FG], ['poteter', 400, 'g', FG],
      ['paprikapulver', 2, 'ss', TV], ['knuste tomater', 1, 'boks', TV], ['kjøttbuljong', 1, 'l', TV], ['rømme', 1, 'beger', KJ]]},
    { id: 'scampipasta', name: 'Scampipasta', minutes: 20, servings: 4, ingredients: [
      ['scampi', 400, 'g', FR], ['linguine', 400, 'g', TV], ['hvitløk', 4, 'fedd', FG], ['chili', 1, 'stk', FG],
      ['cherrytomater', 250, 'g', FG], ['olivenolje', 3, 'ss', TV], ['persille', 1, 'bunt', FG]]},
    { id: 'caesarsalat', name: 'Cæsarsalat med kylling', minutes: 25, servings: 4, ingredients: [
      ['kyllingfilet', 400, 'g', KJ], ['romanosalat', 2, 'stk', FG], ['bacon', 1, 'pk', KJ], ['krutonger', 1, 'pk', TV],
      ['parmesan', 1, 'stk', KJ], ['cæsardressing', 1, 'flaske', TV]]},
    { id: 'kylling-satay', name: 'Kylling satay med ris', minutes: 30, servings: 4, ingredients: [
      ['kyllingfilet', 600, 'g', KJ], ['peanøttsmør', 3, 'ss', TV], ['kokosmelk', 1, 'boks', TV], ['soyasaus', 2, 'ss', TV],
      ['limejuice', 1, 'ss', TV], ['agurk', 1, 'stk', FG], ['ris', 4, 'dl', TV], ['salte peanøtter', 1, 'pk', TV]]},
    { id: 'polsestroganoff', name: 'Pølsestroganoff', minutes: 25, note: 'Rask og barnevennlig', servings: 4, ingredients: [
      ['wienerpølser', 1, 'pk', KJ], ['løk', 1, 'stk', FG], ['tomatpuré', 3, 'ss', TV], ['matfløte', 3, 'dl', KJ],
      ['sennep', 1, 'ss', TV], ['ris', 4, 'dl', TV]]},
    { id: 'sodd', name: 'Sodd', minutes: 90, note: 'Trøndersk klassiker', servings: 6, ingredients: [
      ['fårekjøtt i terninger', 600, 'g', KJ], ['kjøttboller', 400, 'g', KJ], ['gulrot', 3, 'stk', FG], ['poteter', 800, 'g', FG],
      ['kålrot', 0.5, 'stk', FG], ['flatbrød', 1, 'pk', TV], ['salt', 1, 'ss', TV]]}
  ];


  // v0.10: fremgangsmåte (3–6 korte steg) for alle bibliotekretter (id) og startrettene (navn).
  var STEPS = {
"bergensk-fiskesuppe": [
"Skrell og skjær gulrot, purre og sellerirot i fine strimler.",
"Smelt smøret, rør inn melet og spe med buljongen litt etter litt.",
"Ha i melk, fløte og grønnsakene, og la det småkoke i 8–10 minutter.",
"Skjær fisken i biter og la den trekke i suppa i 4–5 minutter uten å koke.",
"Smak til med salt og pepper og dryss over gressløk."
],
"kjottsuppe": [
"Legg kjøttet i en stor gryte, dekk med vann og kok opp. Skum godt.",
"Ha i salt og pepper og la det småkoke under lokk i om lag 1 time.",
"Skrell og skjær grønnsaker og poteter i terninger.",
"Ha grønnsakene i gryta og kok til alt er mørt, 25–30 minutter.",
"Ta ut kjøttet, skjær det i biter og ha det tilbake før servering."
],
"lapskaus": [
"Brun kjøttet i en gryte og ha i hakket løk.",
"Hell over buljongen og la det småkoke i 20 minutter.",
"Skrell poteter, gulrot og kålrot og skjær i terninger.",
"Ha grønnsakene i gryta og kok til potetene begynner å gå i oppløsning.",
"Smak til og server med flatbrød."
],
"farikal": [
"Skjær kålen i båter og del kjøttet i passe biter.",
"Legg kjøtt og kål lagvis i en stor gryte med salt, pepperkorn og litt mel mellom lagene.",
"Hell på 3–4 dl vann og kok opp.",
"La det småkoke under lokk i 2–2½ time, til kjøttet løsner fra beinet.",
"Kok poteter og server."
],
"ovnskylling-rotgronnsaker": [
"Sett ovnen på 200 °C.",
"Skrell og del poteter og rotgrønnsaker i biter, og del løken i båter.",
"Bland grønnsakene med olje, hvitløk, rosmarin, salt og pepper i en langpanne.",
"Legg kyllinglårene oppå og krydre dem.",
"Stek i 45–50 minutter, til kyllingen er gjennomstekt."
],
"karbonader": [
"Kok potetene.",
"Form deigen til karbonader og skjær løken i ringer.",
"Stek karbonadene i smør, 3–4 minutter på hver side, og ta dem ut.",
"Stek løken myk i samme panne.",
"Lag brun saus etter pakken, varm erter og server alt sammen."
],
"medisterkaker": [
"Kok potetene.",
"Varm surkålen i en kjele på lav varme.",
"Stek medisterkakene gyllne i panne, eller varm dem i saus.",
"Lag brun saus etter pakken.",
"Server med tyttebærsyltetøy."
],
"raspeballer": [
"Kok sidefleskene og pølsa i en stor gryte med lettsaltet vann i om lag 30 minutter.",
"Riv rå poteter fint og bland med byggmel, hvetemel og salt til en fast deig.",
"Form store baller med våte hender.",
"Legg ballene i kokende kraft og la dem trekke under lokk i 40–45 minutter.",
"Kok kålroten til stappe og server med smeltet smør og flesk."
],
"plukkfisk": [
"Kok potetene og skjær dem i biter.",
"Pocher fisken i lettsaltet vann i 5–6 minutter og plukk den i biter.",
"Lag en hvit saus av smør, mel og melk.",
"Vend fisk og poteter forsiktig inn i sausen.",
"Stek bacon sprøtt og server på toppen med gressløk og flatbrød."
],
"kokt-torsk": [
"Kok potetene og gulrøttene.",
"Kok opp lettsaltet vann og ta kjelen av platen.",
"Legg i torsken og la den trekke i 6–8 minutter.",
"Smelt smøret og ha i hakket persille.",
"Server med sitronbåter."
],
"seibiff": [
"Kok poteter og gulrøtter.",
"Skjær løken i ringer og stek den myk i smør. Ta den ut.",
"Del fisken i stykker, vend i mel med salt og pepper.",
"Stek fisken i 3–4 minutter på hver side.",
"Legg løken over og server."
],
"stekt-makrell": [
"Kok potetene.",
"Skjær agurken tynt og bland med eddik, sukker og litt vann.",
"Krydre makrellen med salt og pepper.",
"Stek fileten i smør, først på skinnsiden, til den er gyllen.",
"Server med agurksalat og rømme."
],
"teriyakilaks": [
"Kok risen.",
"Skjær laksen i biter og pensle med teriyakisaus.",
"Stek laksen i panne eller ovn på 200 °C i 10–12 minutter.",
"Damp eller wok brokkoli og sukkererter.",
"Dryss sesamfrø over og server."
],
"fiskeboller": [
"Kok poteter og gulrøtter.",
"Sil kraften fra fiskebollene og ta vare på den.",
"Smelt smøret med karri, rør inn melet og spe med kraften.",
"La sausen koke i 5 minutter og legg i fiskebollene.",
"Varm gjennom og server."
],
"fiskepinner": [
"Kok potetene møre.",
"Stek fiskepinnene i ovn eller panne etter pakken.",
"Mos potetene med varm melk og smør, og smak til med salt.",
"Kok erter i 2–3 minutter.",
"Server med remulade."
],
"pytt-i-panne": [
"Skjær poteter, pølser, løk og paprika i små terninger.",
"Stek potetene gyllne i smør.",
"Ha i løk, pølser og paprika og stek videre til alt er varmt.",
"Stek egg i en egen panne.",
"Server med egg og rødbeter."
],
"tacopai": [
"Sett ovnen på 200 °C og kle en form med butterdeig.",
"Brun kjøttdeigen og ha i tacokrydder og litt vann.",
"Fordel kjøttet i formen med paprika og mais.",
"Pisk egg og rømme, hell over og dryss på ost.",
"Stek i 25–30 minutter."
],
"hjemmelaget-pizza": [
"Bland mel, gjær, olje, salt og 3 dl lunkent vann til en deig. La den heve i 30 minutter.",
"Sett ovnen på 250 °C.",
"Kjevle ut deigen på et bakepapir.",
"Smør på pizzasaus og legg på skinke, sopp, paprika og ost.",
"Stek nederst i ovnen i 10–12 minutter."
],
"hamburgere": [
"Stek pommes frites i ovnen etter pakken.",
"Form kjøttdeigen til burgere og krydre med salt og pepper.",
"Stek burgerne 3–4 minutter på hver side og legg på ost mot slutten.",
"Varm brødene.",
"Bygg burgerne med salat, tomat, rødløk og dressing."
],
"carbonara": [
"Kok spaghettien.",
"Stek bacon sprøtt med hakket hvitløk.",
"Pisk egg med revet parmesan og mye pepper.",
"Bland den varme pastaen med bacon og ta pannen av platen.",
"Rør inn eggeblandingen og litt kokevann til det blir kremet."
],
"polsegryte": [
"Kok risen.",
"Skjær pølser, løk og paprika i biter.",
"Stek løk og paprika myk med paprikapulver.",
"Ha i tomater, fløte og pølser og la det småkoke i 10 minutter.",
"Smak til og server med ris."
],
"chili-con-carne": [
"Fres hakket løk og hvitløk.",
"Ha i kjøttdeigen og brun den.",
"Krydre med chili og spisskummen.",
"Ha i tomater og bønner og la det småkoke i 20–30 minutter.",
"Server med ris og rømme."
],
"tikka-masala": [
"Kok risen.",
"Skjær kyllingen i biter og stek den sammen med hakket løk.",
"Ha i sausen og fløten.",
"La det småkoke i 10–15 minutter.",
"Varm naanbrødet og dryss koriander over retten."
],
"vegetarlasagne": [
"Sett ovnen på 200 °C.",
"Skjær grønnsakene i terninger og stek dem myke.",
"Ha i tomatene og la sausen småkoke i 10 minutter.",
"Legg saus, lasagneplater, spinat og cottage cheese lagvis i en form.",
"Dryss ost på toppen og stek i 35–40 minutter."
],
"linsesuppe": [
"Fres løk, hvitløk og gulrot med karri.",
"Ha i linser, tomater, kokosmelk og buljong.",
"La suppa småkoke i 20 minutter, til linsene er møre.",
"Kjør suppa jevn med stavmikser hvis du vil.",
"Smak til med salt og pepper."
],
"gul-ertesuppe": [
"Bløtlegg ertene kvelden før.",
"Kok ertene med sideflesk og timian i om lag 1 time. Skum underveis.",
"Ha i terninger av løk, gulrot og kålrot.",
"Kok videre til ertene er møre og suppa tykner, 20–30 minutter.",
"Skjær flesket i biter og server det i suppa."
],
"blomkalsuppe": [
"Fres hakket løk i en kjele.",
"Ha i blomkål, poteter i biter og buljong.",
"Kok i 15 minutter, til alt er mørt.",
"Kjør suppa jevn og rør inn fløten.",
"Stek bacon sprøtt og server på toppen med brød."
],
"soppristotto": [
"Varm buljongen.",
"Fres sjalottløk og hvitløk i smør, og ha i risen.",
"Tilsett buljong litt etter litt under omrøring i 18–20 minutter.",
"Stek soppen gyllen i en egen panne.",
"Rør inn sopp, smør og parmesan til slutt."
],
"pasta-pesto-kylling": [
"Kok pastaen.",
"Skjær kyllingen i strimler, krydre og stek gjennom.",
"Del tomatene i to.",
"Bland pasta, kylling, pesto og tomater.",
"Topp med ruccola og parmesan."
],
"kremet-laksepasta": [
"Kok pastaen.",
"Skjær laksen i terninger.",
"Fres hvitløk, ha i fløten og la den koke litt inn.",
"Ha i laks og spinat og la det trekke i 3–4 minutter.",
"Bland med pastaen og smak til med sitron og parmesan."
],
"ovnsomelett": [
"Sett ovnen på 200 °C.",
"Pisk egg og melk med salt og pepper.",
"Skjær skinke, paprika og vårløk og fordel i en smurt form.",
"Hell over eggeblandingen og dryss på ost.",
"Stek i 20–25 minutter og server med brød."
],
"svinekoteletter": [
"Kok potetene.",
"Krydre kotelettene med salt og pepper.",
"Stek dem 3–4 minutter på hver side i smør, med løk i ringer.",
"Kok brokkolien i 3–4 minutter.",
"Lag brun saus etter pakken og server."
],
"svinefilet-soppsaus": [
"Kok potetene og sett ovnen på 160 °C.",
"Brun svinefileten på alle sider og stek ferdig i ovnen i 15–20 minutter.",
"Stek soppen i samme panne.",
"Ha i fløte og buljong og la sausen koke litt inn.",
"Kok bønnene i 3 minutter og skjær fileten i skiver."
],
"kyllinglar-ris": [
"Sett ovnen på 200 °C.",
"Krydre kyllinglårene med paprika, hvitløk, salt og pepper.",
"Stek lårene i 40 minutter.",
"Kok risen og maiskolbene.",
"Server med rømme."
],
"stroganoff": [
"Kok risen.",
"Brun kjøttet raskt i en varm panne og ta det ut.",
"Fres løk og sopp med paprikapulver og tomatpuré.",
"Ha i fløten og kjøttet og la det småkoke i 5 minutter.",
"Ha i sylteagurk i strimler og server."
],
"kalruletter": [
"Forvell kålbladene i 2–3 minutter, til de er myke.",
"Bland kjøttdeig med løk, egg, melk og krydder.",
"Legg fyll på hvert blad og rull sammen.",
"Kok rulettene i lettsaltet vann i 20–25 minutter.",
"Lag en saus av smør, mel og kraften, og server med poteter."
],
"fiskegryte": [
"Kok risen.",
"Fres løk og paprika med karripastaen.",
"Ha i kokosmelk og la det koke i 5 minutter.",
"Legg i fisken i biter og la den trekke i 5 minutter.",
"Ha i reker og limejuice til slutt."
],
"ovnstorsk-bacon": [
"Sett ovnen på 200 °C og kok poteter og gulrøtter.",
"Legg torsken i en form og krydre den.",
"Legg bacon over fisken.",
"Stek i 15–20 minutter.",
"Kok ertebelgene raskt og server med smør."
],
"schnitzel": [
"Kok potetene.",
"Bank schnitzlene tynne.",
"Vend dem i mel, sammenvispet egg og griljermel.",
"Stek dem gyllne i smør, 2–3 minutter på hver side.",
"Server med erter og sitron."
],
"kyllingnuggets": [
"Sett ovnen på 220 °C og skjær søtpoteten i båter.",
"Skjær kyllingen i biter og knus cornflakes.",
"Vend kyllingen i mel, egg og cornflakes.",
"Stek nuggets og søtpotet på brett i 18–20 minutter.",
"Server med agurk og ketchup."
],
"risgrot": [
"Kok opp risen med 3 dl vann og en klatt smør.",
"Ha i melken litt etter litt.",
"La grøten småkoke under lokk i om lag 50 minutter. Rør innimellom.",
"Smak til med salt.",
"Server med smør, sukker, kanel og saft."
],
"kyllingenchiladas": [
"Sett ovnen på 200 °C.",
"Stek kyllingen i biter og bland med bønner, mais og litt salsa.",
"Fyll lefsene og rull dem sammen i en form.",
"Hell over resten av salsaen og dryss på ost.",
"Stek i 20 minutter og server med rømme og avokado."
],
"quesadilla": [
"Stek kyllingen i strimler.",
"Skjær paprika og vårløk.",
"Legg kylling, grønnsaker og ost på halve lefsen og brett den.",
"Stek quesadillaene i tørr panne 2–3 minutter på hver side.",
"Del i trekanter og server med salsa og rømme."
],
"biffwok": [
"Kok nudlene.",
"Wok kjøttet raskt på høy varme og ta det ut.",
"Wok grønnsakene med hvitløk og ingefær.",
"Ha i kjøttet, soya- og østerssaus.",
"Bland med nudlene og server."
],
"nudelsuppe": [
"Kok opp buljongen med ingefær og soyasaus.",
"Ha i kyllingen i strimler og gulrot, og la det trekke i 6–8 minutter.",
"Ha i pak choi og nudlene.",
"Kok i 2–3 minutter.",
"Dryss vårløk over."
],
"kyllingfajitas": [
"Skjær kylling, paprika og rødløk i strimler.",
"Stek kyllingen med fajitaskrydder.",
"Ha i grønnsakene og stek dem møre.",
"Varm lefsene.",
"Server med guacamole og rømme."
],
"kjottboller-tomatsaus": [
"Bland kjøttdeig, egg, griljermel, hakket løk, salt og pepper. Form små boller.",
"Stek bollene gyllne.",
"Ha i tomatsausen og la det småkoke i 10 minutter.",
"Kok spaghettien.",
"Server med parmesan og basilikum."
],
"ovnspasta-skinke": [
"Sett ovnen på 200 °C og kok makaronien.",
"Lag en hvit saus av smør, mel og melk.",
"Bland pasta, skinke i biter og brokkoli med sausen.",
"Ha alt i en form og dryss på ost.",
"Stek i 20 minutter."
],
"sursot-svin": [
"Kok risen.",
"Skjær løk og paprika i biter.",
"Stek kjøttet raskt på høy varme.",
"Ha i grønnsaker og ananas og stek videre i 3–4 minutter.",
"Rør inn sausen og varm gjennom."
],
"grillspyd-kylling": [
"Skjær kylling og grønnsaker i biter.",
"Tre bitene på spyd og krydre med salt og pepper.",
"Grill eller stek spydene i ovn på 225 °C i 15–20 minutter.",
"Varm pitabrødene.",
"Server med tzatziki."
],
"stekt-sild": [
"Kok potetene.",
"Vend sildefiletene i havregryn med salt og pepper.",
"Stek løken myk i smør og ta den ut.",
"Stek silda 2–3 minutter på hver side.",
"Server med løk og rødbeter."
],
"bacalao": [
"Vann ut klippfisken i 1–2 døgn. Bytt vann ofte.",
"Skjær fisk, poteter, løk og paprika i biter.",
"Legg alt lagvis i en gryte med hvitløk, tomater og olje.",
"La det småkoke under lokk i om lag 1 time. Ikke rør.",
"Ha i oliven mot slutten."
],
"kikertgryte": [
"Kok risen.",
"Fres løk og hvitløk med karri.",
"Ha i søtpotet i terninger, tomater og kokosmelk.",
"La det småkoke i 15 minutter.",
"Ha i kikerter og spinat og varm gjennom."
],
"falafel-pita": [
"Varm falafel i ovnen etter pakken.",
"Varm pitabrødene.",
"Skjær salat, tomat og agurk.",
"Fyll brødene med hummus, grønnsaker og falafel.",
"Topp med yoghurt."
],
"halloumi-ovnsgronnsaker": [
"Sett ovnen på 220 °C.",
"Skjær grønnsakene i biter og bland med olje, salt og pepper.",
"Stek i 25 minutter.",
"Legg halloumi i skiver oppå og stek i 10 minutter til.",
"Lag couscous etter pakken og server."
],
"potet-purresuppe": [
"Skjær poteter, purre og løk i biter.",
"Fres løk og purre i en kjele.",
"Ha i poteter og buljong og kok i 15–20 minutter.",
"Kjør suppa jevn og rør inn fløten.",
"Stek bacon sprøtt og server på toppen med brød."
],
"fiskeburger": [
"Stek pommes frites i ovnen etter pakken.",
"Stek fiskeburgerne etter pakken.",
"Varm brødene.",
"Skjær salat, tomat og rødløk.",
"Bygg burgerne med remulade."
],
"reker-loff": [
"Skjær loffen i skiver.",
"Del sitronen i båter og plukk dillen.",
"Legg rekene i en bolle.",
"Sett fram majones og smør.",
"La alle skrelle selv ved bordet."
],
"kyllingform-brokkoli": [
"Sett ovnen på 200 °C og kok risen.",
"Skjær kyllingen i biter og stek den lett.",
"Legg kylling og brokkoli i en form.",
"Bland fløte og karri, hell over og dryss på ost.",
"Stek i 25 minutter."
],
"gulasjsuppe": [
"Brun kjøttet i en gryte.",
"Ha i løk, paprika og paprikapulver.",
"Hell over buljong og tomater og la det småkoke i 40 minutter.",
"Ha i poteter i terninger og kok til de er møre.",
"Server med en skje rømme."
],
"scampipasta": [
"Kok pastaen.",
"Fres hvitløk og chili i olje.",
"Ha i scampi og tomater og stek i 3–4 minutter.",
"Vend inn pastaen og litt kokevann.",
"Dryss persille over."
],
"caesarsalat": [
"Stek kyllingen og skjær den i skiver.",
"Stek bacon sprøtt.",
"Riv salaten i biter.",
"Bland salaten med dressing.",
"Topp med kylling, bacon, krutonger og parmesan."
],
"kylling-satay": [
"Kok risen.",
"Skjær kyllingen i biter og stek den gjennom.",
"Rør sammen peanøttsmør, kokosmelk, soyasaus og limejuice og varm opp.",
"Vend kyllingen i sausen.",
"Server med agurk og salte peanøtter."
],
"polsestroganoff": [
"Kok risen.",
"Skjær pølser og løk i strimler.",
"Stek løken myk og ha i pølsene.",
"Rør inn tomatpuré, sennep og fløte.",
"La det småkoke i 5 minutter og server."
],
"sodd": [
"Kok kjøttet i lettsaltet vann og skum godt.",
"La det småkoke i om lag 1 time.",
"Ha i kjøttbollene, gulrot og kålrot i biter.",
"Kok poteter for seg.",
"Server med flatbrød."
]
};
  var SEED_STEPS = {
"Taco": [
"Brun kjøttdeigen og ha i tacokrydder og litt vann.",
"Skjær salat, tomat, agurk og løk.",
"Varm lefsene.",
"Sett fram mais, ost, rømme og saus.",
"La alle bygge sin egen taco."
],
"Spaghetti bolognese": [
"Fres hakket løk, hvitløk og revet gulrot.",
"Ha i kjøttdeigen og brun den.",
"Rør inn tomatpuré og tomater og la sausen småkoke i 20 minutter.",
"Kok spaghettien.",
"Server med revet parmesan."
],
"Fiskekaker med poteter og gulrøtter": [
"Kok poteter og gulrøtter.",
"Stek løken myk og ta den ut.",
"Stek fiskekakene gyllne.",
"Lag en hvit saus av smør, mel og melk.",
"Server med løk og saus."
],
"Kyllinggryte med ris": [
"Kok risen.",
"Skjær kylling og grønnsaker i biter.",
"Stek kyllingen med løk, hvitløk og karri.",
"Ha i paprika, tomater og fløte.",
"La gryta småkoke i 10–15 minutter."
],
"Laks med poteter og brokkoli": [
"Kok potetene og sett ovnen på 200 °C.",
"Legg laksen i en form og krydre den.",
"Stek laksen i 12–15 minutter.",
"Kok brokkolien i 3–4 minutter.",
"Bland rømme og dill og server med sitron."
],
"Pølser i lompe": [
"Varm pølsene i vann uten å koke dem.",
"Sett fram lomper.",
"Sett fram ketchup, sennep og sprøstekt løk.",
"Server med potetsalat."
],
"Kjøttkaker i brun saus": [
"Bland kjøttdeig, hakket løk, egg, melk, potetmel, salt og pepper.",
"Form kakene og stek dem gyllne.",
"Lag brun saus og la kakene trekke i sausen i 10 minutter.",
"Kok poteter og erter.",
"Server med tyttebærsyltetøy."
],
"Pannekaker med bacon": [
"Visp mel, melk, egg og litt salt til en jevn røre. La den svelle i 15 minutter.",
"Stek bacon sprøtt.",
"Stek tynne pannekaker i smør.",
"Server med bacon og blåbærsyltetøy."
],
"Fiskegrateng": [
"Sett ovnen på 200 °C og kok makaronien.",
"Lag en tykk hvit saus av smør, mel og melk. Avkjøl litt og rør inn eggene.",
"Bland inn fisk i biter, makaroni og revet gulrot.",
"Ha alt i en form og dryss på ost og griljermel.",
"Stek i 40 minutter."
],
"Lasagne": [
"Lag kjøttsaus av kjøttdeig, løk, hvitløk, gulrot og tomater.",
"Lag en hvit saus av smør, mel og melk.",
"Legg kjøttsaus, lasagneplater og hvit saus lagvis i en form.",
"Dryss ost på toppen.",
"Stek på 200 °C i 40 minutter."
],
"Kylling-wok": [
"Kok risen.",
"Skjær kylling og paprika i strimler.",
"Wok kyllingen på høy varme med hvitløk og ingefær.",
"Ha i grønnsakene og wok i 3–4 minutter.",
"Smak til med soyasaus."
],
"Tomatsuppe med egg og makaroni": [
"Kok eggene i 8–9 minutter og avkjøl dem.",
"Kok makaronien.",
"Lag suppa etter pakken.",
"Server suppa med makaroni og egg i båter."
]
};

  function ing(t) { return { name: t[0], qty: t[1], unit: t[2], aisle: t[3] }; }
  window.UKESHANDEL_LIBRARY = L.map(function (r) {
    return { id: r.id, name: r.name, minutes: r.minutes, note: r.note || '', servings: r.servings || 4, ingredients: r.ingredients.map(ing), steps: (STEPS[r.id] || []).slice() };
  });
  window.UKESHANDEL_SEED_STEPS = SEED_STEPS;
  // BEGIN DISHES (generert av tools/build-dishes.js fra v011-retter-utkast.csv – ikke rediger for hånd)
  window.UKESHANDEL_DISH_CATEGORIES = ["Kjøttdeig","Kylling","Fisk","Pasta","Pølser","Kjøtt","Suppe","Vegetar","Pizza og bakst","Egg og lett"];
  window.UKESHANDEL_DISHES = [
    {"id":"taco","name":"Taco","category":"Kjøttdeig","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":25,"servings":4,"ingredients":[["kjøttdeig",400,"g","Kjøl"],["tacokrydder",1,"pk","Tørrvare"],["tacolefser",1,"pk","Tørrvare"],["tacosaus",1,"glass","Tørrvare"],["isbergsalat",1,"stk","Frukt/grønt"],["tomat",3,"stk","Frukt/grønt"],["agurk",1,"stk","Frukt/grønt"],["mais",1,"boks","Tørrvare"],["revet ost",1,"pk","Meieri"],["rømme",1,"beger","Meieri"]],"steps":["Stek kjøttdeigen brun i en stekepanne på høy varme.","Rør inn tacokrydder og vann etter anvisningen på posen, og la det småkoke i noen minutter.","Kutt isbergsalat, tomat og agurk, og hell av maisen.","Varm tacolefsene i ovn eller mikro.","Sett fram kjøttdeig, grønnsaker, tacosaus, revet ost og rømme, så fyller alle sine egne lefser."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":30,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["kjøttdeig",400,"g","Kjøl"],["løk",1,"stk","Frukt/grønt"],["hvitløk",2,"fedd","Frukt/grønt"],["spisskummen",1,"ts","Tørrvare"],["paprikapulver",2,"ts","Tørrvare"],["chilipulver",1,"ts","Tørrvare"],["knuste tomater",1,"boks","Tørrvare"],["tacolefser",1,"pk","Tørrvare"],["isbergsalat",1,"stk","Frukt/grønt"],["tomat",3,"stk","Frukt/grønt"],["avokado",2,"stk","Frukt/grønt"],["revet ost",1,"pk","Meieri"],["rømme",1,"beger","Meieri"]],"steps":["Hakk løk og hvitløk, og fres dem myke i litt olje.","Tilsett kjøttdeigen og stek den brun. Rør inn spisskummen, paprikapulver og chilipulver.","Hell i de knuste tomatene og la kjøttsausen småkoke under lokk i ca. 15 minutter. Smak til med salt.","Mens det koker: kutt isbergsalat og tomat, og mos avokadoen med litt salt.","Varm tacolefsene og sett alt fram med revet ost og rømme."]}]},
    {"id":"fredagstaco-med-kylling","name":"Fredagstaco med kylling","category":"Kylling","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":25,"servings":4,"ingredients":[["kyllingkjøttdeig",400,"g","Kjøl"],["tacokrydder",1,"pk","Tørrvare"],["tacolefser",1,"pk","Tørrvare"],["tacosaus",1,"glass","Tørrvare"],["isbergsalat",1,"stk","Frukt/grønt"],["tomat",3,"stk","Frukt/grønt"],["mais",1,"boks","Tørrvare"],["revet ost",1,"pk","Meieri"],["rømme",1,"beger","Meieri"]],"steps":["Stek kyllingkjøttdeigen i litt olje til den er gjennomstekt.","Rør inn tacokrydder og vann etter anvisningen, og la det koke inn noen minutter.","Kutt isbergsalat og tomat, og hell av maisen.","Varm tacolefsene.","Sett fram kyllingdeigen, grønnsakene, tacosaus, revet ost og rømme."]}]},
    {"id":"tacopai","name":"Tacopai","category":"Kjøttdeig","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":25,"passiveKind":"ovn","ingredients":[["kjøttdeig",400,"g","Kjøl"],["tacokrydder",1,"pk","Tørrvare"],["ferdig paideig",1,"pk","Kjøl"],["rømme",1,"beger","Meieri"],["revet ost",1,"pk","Meieri"],["tomat",2,"stk","Frukt/grønt"],["isbergsalat",1,"stk","Frukt/grønt"]],"steps":["Sett ovnen på 200 °C. Kle en paiform med paideigen og prikk bunnen med en gaffel.","Stek kjøttdeigen brun og rør inn tacokrydder og litt vann.","Fordel kjøttdeigen i paiformen, smør over rømme og strø revet ost på toppen.","Stek paien midt i ovnen i ca. 25 minutter, til osten er gyllen.","Mens den står i ovnen: kutt isbergsalat og tomat til en enkel salat ved siden av."]}]},
    {"id":"spaghetti-bolognese","name":"Spaghetti bolognese","category":"Pasta","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["kjøttdeig",400,"g","Kjøl"],["ferdig bolognesesaus",1,"glass","Tørrvare"],["spaghetti",400,"g","Tørrvare"],["revet parmesan",1,"pk","Meieri"]],"steps":["Kok opp godt saltet vann og kok spaghettien etter anvisningen på pakken.","Stek kjøttdeigen brun i en kjele.","Hell i den ferdige bolognesesausen og varm opp til det koker.","Sil spaghettien og server med sausen og revet parmesan."]},{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["kjøttdeig",400,"g","Kjøl"],["løk",1,"stk","Frukt/grønt"],["knuste tomater",2,"boks","Tørrvare"],["tomatpuré",2,"ss","Tørrvare"],["spaghetti",400,"g","Tørrvare"],["revet parmesan",1,"pk","Meieri"]],"steps":["Hakk løken og fres den myk i litt olje.","Tilsett kjøttdeigen og stek den brun. Rør inn tomatpuré.","Hell i de knuste tomatene, smak til med salt og pepper, og la sausen småkoke i ca. 15 minutter.","Kok spaghettien i godt saltet vann mens sausen koker.","Server spaghettien med sausen og revet parmesan."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":25,"servings":4,"passiveMinutes":50,"passiveKind":"koking","ingredients":[["kjøttdeig",400,"g","Kjøl"],["løk",1,"stk","Frukt/grønt"],["gulrot",2,"stk","Frukt/grønt"],["stangselleri",2,"stk","Frukt/grønt"],["hvitløk",2,"fedd","Frukt/grønt"],["knuste tomater",2,"boks","Tørrvare"],["tomatpuré",2,"ss","Tørrvare"],["rødvin eller buljong",2,"dl","Tørrvare"],["spaghetti",400,"g","Tørrvare"],["parmesan",1,"stk","Meieri"]],"steps":["Finhakk løk, gulrot, stangselleri og hvitløk.","Fres grønnsakene møre i litt olje på middels varme i ca. 8 minutter.","Skru opp varmen, tilsett kjøttdeigen og stek den brun. Rør inn tomatpuré.","Hell i rødvin eller buljong og knuste tomater. La sausen småkoke under halvt lokk i ca. 50 minutter, og rør av og til.","Kok spaghettien i godt saltet vann de siste minuttene, og smak sausen til med salt og pepper.","Server med nyrevet parmesan."]}]},
    {"id":"lasagne","name":"Lasagne","category":"Pasta","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":5,"servings":4,"passiveMinutes":50,"passiveKind":"ovn","ingredients":[["frossen lasagne",2,"pk","Frys"],["salat",1,"pose","Frukt/grønt"]],"steps":["Sett ovnen på temperaturen som står på pakken (vanligvis 200 °C).","Ta lasagnen ut av esken og sett den midt i ovnen.","Stek i ca. 50 minutter, til den er varm i midten og gyllen på toppen.","Skyll og riv salaten mens lasagnen står i ovnen, og server ved siden av."]},{"key":"halvferdig","name":"Halvferdig","minutes":20,"servings":4,"passiveMinutes":40,"passiveKind":"ovn","ingredients":[["kjøttdeig",400,"g","Kjøl"],["ferdig lasagnesaus",1,"glass","Tørrvare"],["ferdig hvit saus",1,"pk","Tørrvare"],["lasagneplater",1,"pk","Tørrvare"],["revet ost",1,"pk","Meieri"]],"steps":["Sett ovnen på 200 °C.","Stek kjøttdeigen brun og bland den med den ferdige lasagnesausen.","Legg lag i en ildfast form: kjøttsaus, lasagneplater og hvit saus. Gjenta og avslutt med hvit saus.","Strø revet ost over.","Stek midt i ovnen i ca. 40 minutter, og la lasagnen hvile litt før du deler den."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":45,"servings":4,"passiveMinutes":45,"passiveKind":"ovn","ingredients":[["kjøttdeig",500,"g","Kjøl"],["løk",1,"stk","Frukt/grønt"],["gulrot",2,"stk","Frukt/grønt"],["knuste tomater",2,"boks","Tørrvare"],["lasagneplater",1,"pk","Tørrvare"],["smør",3,"ss","Meieri"],["hvetemel",3,"ss","Tørrvare"],["melk",6,"dl","Meieri"],["revet ost",1,"pk","Meieri"]],"steps":["Hakk løk og riv gulrot. Fres dem i litt olje, tilsett kjøttdeigen og stek den brun.","Hell i knuste tomater, smak til med salt og pepper, og la kjøttsausen koke i ca. 15 minutter.","Lag hvit saus: smelt smøret, rør inn melet og spe med melk litt om gangen. Kok i 5 minutter og smak til med salt.","Sett ovnen på 200 °C. Legg lag med kjøttsaus, lasagneplater og hvit saus i en ildfast form, og avslutt med hvit saus.","Strø revet ost over og stek i ca. 45 minutter. La lasagnen hvile i 10 minutter før servering."]}]},
    {"id":"pizza","name":"Pizza","category":"Pizza og bakst","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":5,"servings":4,"passiveMinutes":15,"passiveKind":"ovn","ingredients":[["frossen pizza",2,"stk","Frys"],["salat",1,"pose","Frukt/grønt"]],"steps":["Sett ovnen på temperaturen som står på pakken.","Legg pizzaen rett på rista midt i ovnen.","Stek i ca. 15 minutter, til bunnen er sprø og osten har smeltet.","Skyll og riv salaten mens pizzaen steker."]},{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":15,"passiveKind":"ovn","ingredients":[["ferdig pizzabunn",2,"stk","Kjøl"],["pizzasaus",1,"glass","Tørrvare"],["revet ost",1,"pk","Meieri"],["skinke",1,"pk","Kjøl"],["paprika",1,"stk","Frukt/grønt"]],"steps":["Sett ovnen på 220 °C og legg pizzabunnen på et brett med bakepapir.","Smør pizzasaus over bunnen.","Kutt paprika i strimler og skinke i biter, og fordel det på pizzaen.","Strø revet ost over og stek i ca. 15 minutter, til kantene er gylne."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":30,"servings":4,"passiveMinutes":60,"passiveKind":"heving","ingredients":[["hvetemel",6,"dl","Tørrvare"],["gjær",1,"pk","Kjøl"],["olivenolje",2,"ss","Tørrvare"],["pizzasaus",1,"glass","Tørrvare"],["mozzarella",2,"stk","Meieri"],["skinke",1,"pk","Kjøl"],["sjampinjong",1,"boks","Frukt/grønt"]],"steps":["Løs opp gjæret i ca. 3 dl lunkent vann. Tilsett olivenolje, litt salt og hvetemel, og elt til en smidig deig.","La deigen heve tildekket i ca. 60 minutter, til den har doblet seg.","Sett ovnen på 250 °C. Kutt sjampinjong i skiver og skinke i biter mens deigen hever.","Kjevle ut deigen på et brett med bakepapir og smør på pizzasaus.","Fordel skinke, sjampinjong og revet mozzarella over.","Stek nederst i ovnen i 10–12 minutter, til bunnen er sprø."]}]},
    {"id":"pizzasnurrer","name":"Pizzasnurrer","category":"Pizza og bakst","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":15,"passiveKind":"ovn","ingredients":[["ferdig pizzadeig",1,"pk","Kjøl"],["pizzasaus",1,"glass","Tørrvare"],["revet ost",1,"pk","Meieri"],["skinke",1,"pk","Kjøl"],["agurk",1,"stk","Frukt/grønt"]],"steps":["Sett ovnen på 220 °C. Rull ut pizzadeigen på bakepapir.","Smør pizzasaus over deigen og strø over revet ost og hakket skinke.","Rull deigen sammen fra langsiden og skjær rullen i ca. 2 cm tykke skiver.","Legg snurrene på et brett og stek i ca. 15 minutter, til de er gylne.","Server med agurkstaver."]}]},
    {"id":"pizzaboller","name":"Pizzaboller","category":"Pizza og bakst","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":15,"passiveKind":"ovn","ingredients":[["ferdig pizzadeig",1,"pk","Kjøl"],["pizzasaus",1,"glass","Tørrvare"],["revet ost",1,"pk","Meieri"],["pepperoni",1,"pk","Kjøl"]],"steps":["Sett ovnen på 220 °C. Del pizzadeigen i 12 like store biter.","Trykk hver bit flat og legg på en skje pizzasaus, litt revet ost og et par skiver pepperoni.","Brett kantene opp og klyp dem godt sammen til boller.","Legg bollene med skjøten ned på et brett med bakepapir og stek i ca. 15 minutter."]}]},
    {"id":"fiskegrateng","name":"Fiskegrateng","category":"Fisk","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":5,"servings":4,"passiveMinutes":45,"passiveKind":"ovn","ingredients":[["frossen fiskegrateng",2,"pk","Frys"],["gulrot",4,"stk","Frukt/grønt"],["revet ost",1,"pk","Meieri"]],"steps":["Sett ovnen på temperaturen som står på pakken (vanligvis 200 °C).","Ta fiskegratengen ut av emballasjen og strø gjerne litt ekstra revet ost over.","Stek midt i ovnen i ca. 45 minutter, til den er gyllen og varm i midten.","Skrell gulrøttene og kutt dem i staver til å ha ved siden av."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":35,"servings":4,"passiveMinutes":40,"passiveKind":"ovn","ingredients":[["torskefilet",400,"g","Kjøl"],["makaroni",2,"dl","Tørrvare"],["smør",3,"ss","Meieri"],["hvetemel",4,"ss","Tørrvare"],["melk",6,"dl","Meieri"],["egg",3,"stk","Meieri"],["revet ost",1,"pk","Meieri"],["gulrot",4,"stk","Frukt/grønt"],["griljermel",1,"pk","Tørrvare"]],"steps":["Kok makaronien etter anvisningen og sil den. Sett ovnen på 200 °C.","Lag hvit saus: smelt smøret, rør inn melet og spe med melken. Kok i 5 minutter og la sausen avkjøles litt.","Rør inn eggene og smak til med salt og pepper.","Kutt torskefileten i biter. Vend fisk og makaroni inn i sausen og hell alt i en smurt ildfast form.","Strø over revet ost og griljermel, og stek i ca. 40 minutter.","Skrell gulrøttene og kok eller server dem rå i staver ved siden av."]}]},
    {"id":"fiskekaker-med-poteter-og-gulrotter","name":"Fiskekaker med poteter og gulrøtter","category":"Fisk","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":10,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["fiskekaker",600,"g","Kjøl"],["poteter",800,"g","Frukt/grønt"],["gulrot",4,"stk","Frukt/grønt"],["løk",1,"stk","Frukt/grønt"],["smør",2,"ss","Meieri"]],"steps":["Skrell potetene og gulrøttene, og kok dem møre i lettsaltet vann i ca. 15 minutter.","Kutt løken i ringer og stek den myk og gyllen i smør.","Stek fiskekakene i samme panne til de er varme og har fått farge.","Server fiskekakene med løken, potetene og gulrøttene."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":30,"servings":4,"passiveMinutes":20,"passiveKind":"koking","ingredients":[["kvernet fiskefarse",600,"g","Kjøl"],["poteter",800,"g","Frukt/grønt"],["gulrot",4,"stk","Frukt/grønt"],["løk",1,"stk","Frukt/grønt"],["smør",2,"ss","Meieri"]],"steps":["Skrell potetene og gulrøttene, og sett dem på kok i lettsaltet vann i ca. 20 minutter.","Form fiskefarsen til flate kaker med en skje dyppet i kaldt vann.","Stek kakene i smør på middels varme, 3–4 minutter på hver side, til de er gylne og gjennomstekte.","Kutt løken i ringer og stek den myk i panna etter fiskekakene.","Server med poteter, gulrøtter og løken."]}]},
    {"id":"fiskeboller","name":"Fiskeboller i hvit saus","category":"Fisk","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":10,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["fiskeboller",1,"boks","Tørrvare"],["poteter",800,"g","Frukt/grønt"],["gulrot",4,"stk","Frukt/grønt"],["karri",1,"ts","Tørrvare"]],"steps":["Skrell potetene og gulrøttene, og kok dem i lettsaltet vann i ca. 15 minutter.","Hell kraften fra fiskebollene i en kjele, og jevn den til en saus med litt mel rørt ut i vann.","Smak sausen til med karri og la den koke i et par minutter.","Legg i fiskebollene og varm dem forsiktig i sausen.","Server med poteter og gulrøtter."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":20,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["fiskeboller",1,"boks","Tørrvare"],["smør",2,"ss","Meieri"],["hvetemel",3,"ss","Tørrvare"],["melk",5,"dl","Meieri"],["poteter",800,"g","Frukt/grønt"],["gulrot",4,"stk","Frukt/grønt"]],"steps":["Kok poteter og gulrøtter.","Sil kraften fra fiskebollene og ta vare på den.","Smelt smøret med karri, rør inn melet og spe med kraften.","La sausen koke i 5 minutter og legg i fiskebollene.","Varm gjennom og server."]}]},
    {"id":"fiskepinner","name":"Fiskepinner med potetmos","category":"Fisk","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":5,"servings":4,"passiveMinutes":15,"passiveKind":"ovn","ingredients":[["fiskepinner",1,"pk","Frys"],["ferdig potetmos",1,"pk","Tørrvare"],["erter",1,"pk","Frys"],["remulade",1,"stk","Kjøl"]],"steps":["Sett ovnen på temperaturen som står på pakken.","Legg fiskepinnene på et brett med bakepapir og stek i ca. 15 minutter, snu dem halvveis.","Varm potetmosen og kok ertene i et par minutter.","Server fiskepinnene med mos, erter og remulade."]},{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":20,"passiveKind":"koking","ingredients":[["fiskepinner",1,"pk","Frys"],["poteter",1,"kg","Frukt/grønt"],["melk",2,"dl","Meieri"],["smør",2,"ss","Meieri"],["erter",1,"pk","Frys"],["remulade",1,"stk","Kjøl"]],"steps":["Kok potetene møre.","Stek fiskepinnene i ovn eller panne etter pakken.","Mos potetene med varm melk og smør, og smak til med salt.","Kok erter i 2–3 minutter.","Server med remulade."]}]},
    {"id":"panert-fisk-med-potetbater","name":"Panert fisk med potetbåter","category":"Fisk","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":5,"servings":4,"passiveMinutes":25,"passiveKind":"ovn","ingredients":[["panert fiskefilet",1,"pk","Frys"],["frosne potetbåter",1,"pose","Frys"],["remulade",1,"stk","Kjøl"],["gulrot",3,"stk","Frukt/grønt"]],"steps":["Sett ovnen på 220 °C, eller det som står på pakken.","Legg potetbåtene på et brett og sett dem i ovnen.","Legg den panerte fisken på brettet etter ca. 10 minutter, og stek alt ferdig i ca. 15 minutter til.","Kutt gulrøttene i staver og server med remulade."]},{"key":"halvferdig","name":"Halvferdig","minutes":20,"servings":4,"passiveMinutes":25,"passiveKind":"ovn","ingredients":[["torskefilet",600,"g","Kjøl"],["griljermel",1,"pk","Tørrvare"],["egg",2,"stk","Meieri"],["poteter",800,"g","Frukt/grønt"],["remulade",1,"stk","Kjøl"]],"steps":["Sett ovnen på 220 °C. Skjær potetene i båter, vend dem i litt olje og salt, og stek dem i ca. 25 minutter.","Del torskefileten i porsjonsstykker og krydre med salt og pepper.","Dypp fisken i sammenvispet egg og vend den i griljermel.","Stek fisken i olje i stekepanna, ca. 3 minutter på hver side, til den er gyllen.","Server fisken med potetbåtene og remulade."]}]},
    {"id":"ovnsbakt-laks","name":"Ovnsbakt laks","category":"Fisk","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":10,"servings":4,"passiveMinutes":20,"passiveKind":"ovn","ingredients":[["laksefilet",600,"g","Kjøl"],["poteter",800,"g","Frukt/grønt"],["brokkoli",1,"stk","Frukt/grønt"],["rømme",1,"beger","Meieri"]],"steps":["Sett ovnen på 200 °C. Del potetene i to og legg dem i en form med litt olje og salt.","Stek potetene i ca. 10 minutter.","Legg laksefileten og brokkolibuketter i formen, krydre med salt og pepper, og stek alt i ca. 20 minutter til.","Server med rømme."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":20,"servings":4,"passiveMinutes":20,"passiveKind":"ovn","ingredients":[["laksefilet",600,"g","Kjøl"],["småpoteter",800,"g","Frukt/grønt"],["asparges",1,"bunt","Frukt/grønt"],["sitron",1,"stk","Frukt/grønt"],["smør",50,"g","Meieri"],["dill",1,"bunt","Frukt/grønt"]],"steps":["Sett ovnen på 200 °C. Del småpotetene og vend dem i litt smeltet smør og salt i en ildfast form.","Stek potetene i ca. 10 minutter.","Legg laksen og aspargesen i formen, krydre med salt og pepper, og legg sitronskiver over laksen.","Stek videre i ca. 15–20 minutter, til laksen akkurat er gjennomstekt.","Smelt resten av smøret, rør inn hakket dill, og hell det over laksen ved servering."]}]},
    {"id":"teriyakilaks","name":"Teriyakilaks med ris","category":"Fisk","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":10,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["laksefilet",600,"g","Kjøl"],["teriyakisaus",1,"flaske","Tørrvare"],["ris",3,"dl","Tørrvare"],["brokkoli",1,"stk","Frukt/grønt"],["sesamfrø",1,"pose","Tørrvare"]],"steps":["Kok risen.","Skjær laksen i biter og pensle med teriyakisaus.","Stek laksen i panne eller ovn på 200 °C i 10–12 minutter.","Damp eller wok brokkoli og sukkererter.","Dryss sesamfrø over og server."]}]},
    {"id":"laks-i-folie-med-gronnsaker","name":"Laks i folie med grønnsaker","category":"Fisk","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":10,"servings":4,"passiveMinutes":25,"passiveKind":"ovn","ingredients":[["laksefilet",600,"g","Kjøl"],["squash",1,"stk","Frukt/grønt"],["paprika",1,"stk","Frukt/grønt"],["sitron",1,"stk","Frukt/grønt"],["poteter",800,"g","Frukt/grønt"]],"steps":["Sett ovnen på 200 °C. Skrell potetene, kutt dem i båter og sett dem i ovnen med litt olje og salt.","Kutt squash og paprika i biter.","Legg grønnsakene og et laksestykke på hvert sitt stykke folie, krydre med salt og pepper, og legg på en sitronskive.","Brett folien godt igjen til pakker og legg dem i ovnen sammen med potetene i ca. 25 minutter."]}]},
    {"id":"lakseburger","name":"Lakseburger","category":"Fisk","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":10,"servings":4,"passiveMinutes":10,"passiveKind":"ovn","ingredients":[["frosne lakseburgere",1,"pk","Frys"],["hamburgerbrød",1,"pk","Tørrvare"],["isbergsalat",1,"stk","Frukt/grønt"],["tomat",2,"stk","Frukt/grønt"],["dressing",1,"flaske","Kjøl"]],"steps":["Sett ovnen på temperaturen som står på pakken, og stek lakseburgerne i ca. 10 minutter.","Kutt tomat i skiver og riv isbergsalaten.","Varm hamburgerbrødene de siste minuttene i ovnen.","Bygg burgerne med salat, tomat, lakseburger og dressing."]}]},
    {"id":"fiskeburger","name":"Fiskeburger","category":"Fisk","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":20,"servings":4,"ingredients":[["frosne fiskeburgere",1,"pk","Frys"],["hamburgerbrød",1,"pk","Tørrvare"],["isbergsalat",1,"stk","Frukt/grønt"],["remulade",1,"stk","Kjøl"]],"steps":["Stek fiskeburgerne i litt olje i stekepanna etter anvisningen på pakken.","Varm hamburgerbrødene i panna eller ovnen.","Riv isbergsalaten.","Bygg burgerne med salat, fiskeburger og remulade."]},{"key":"halvferdig","name":"Halvferdig","minutes":20,"servings":4,"passiveMinutes":10,"passiveKind":"ovn","ingredients":[["fiskekaker",600,"g","Kjøl"],["hamburgerbrød",1,"pk","Tørrvare"],["isbergsalat",1,"stk","Frukt/grønt"],["tomat",2,"stk","Frukt/grønt"],["remulade",1,"stk","Kjøl"]],"steps":["Sett ovnen på 200 °C og varm fiskekakene i ca. 10 minutter, eller stek dem i panna.","Kutt tomat i skiver og riv isbergsalaten.","Varm hamburgerbrødene.","Legg salat, fiskekake, tomat og remulade i brødene."]}]},
    {"id":"kremet-laksepasta","name":"Kremet laksepasta","category":"Pasta","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":25,"servings":4,"ingredients":[["røkt laks",200,"g","Kjøl"],["matfløte",3,"dl","Meieri"],["pasta",400,"g","Tørrvare"],["spinat",1,"pose","Frukt/grønt"],["sitron",1,"stk","Frukt/grønt"]],"steps":["Kok pastaen i godt saltet vann etter anvisningen.","Varm matfløten i en panne og la den koke inn litt.","Rør inn spinaten til den faller sammen, og smak til med revet sitronskall, sitronsaft, salt og pepper.","Riv den røkte laksen i biter og vend den forsiktig inn i sausen.","Vend pastaen inn i sausen og server med en sitronbåt."]}]},
    {"id":"laksesuppe","name":"Laksesuppe","category":"Suppe","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["posesuppe fiskesuppe",2,"pose","Tørrvare"],["laksefilet",300,"g","Kjøl"],["purre",1,"stk","Frukt/grønt"]],"steps":["Rør ut posesuppen i vann etter anvisningen og kok den opp.","Rens purren og kutt den i tynne ringer. Kutt laksen i terninger.","Legg purre og laks i suppa og la det trekke på svak varme i ca. 5 minutter, uten å koke.","Smak til med pepper og server."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":20,"servings":4,"passiveMinutes":20,"passiveKind":"koking","ingredients":[["laksefilet",400,"g","Kjøl"],["fiskebuljong",1,"l","Tørrvare"],["matfløte",3,"dl","Meieri"],["gulrot",2,"stk","Frukt/grønt"],["purre",1,"stk","Frukt/grønt"],["poteter",4,"stk","Frukt/grønt"]],"steps":["Skrell poteter og gulrøtter og kutt dem i terninger. Rens purren og kutt den i ringer.","Kok opp fiskebuljongen og legg i poteter og gulrot. La det koke i ca. 15 minutter.","Tilsett purre og matfløte, og kok i noen minutter til.","Kutt laksen i terninger, legg dem i suppa og la dem trekke i ca. 5 minutter uten at suppa koker.","Smak til med salt og pepper."]}]},
    {"id":"bergensk-fiskesuppe","name":"Bergensk fiskesuppe","category":"Suppe","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["posesuppe fiskesuppe",2,"pose","Tørrvare"],["fiskeboller",1,"boks","Tørrvare"],["gulrot",2,"stk","Frukt/grønt"]],"steps":["Skrell gulrøttene og kutt dem i tynne skiver.","Rør ut posesuppen i vann etter anvisningen, tilsett gulroten og kok opp.","La suppa småkoke til gulroten er mør, ca. 8 minutter.","Del fiskebollene og varm dem i suppa de siste minuttene."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":25,"servings":4,"passiveMinutes":20,"passiveKind":"koking","ingredients":[["torskefilet",400,"g","Kjøl"],["laksefilet",200,"g","Kjøl"],["gulrot",2,"stk","Frukt/grønt"],["purre",1,"stk","Frukt/grønt"],["sellerirot",0.5,"stk","Frukt/grønt"],["fiskebuljong",1,"l","Tørrvare"],["melk",3,"dl","Meieri"],["matfløte",2,"dl","Meieri"]],"steps":["Skrell og skjær gulrot, purre og sellerirot i fine strimler.","Smelt smøret, rør inn melet og spe med buljongen litt etter litt.","Ha i melk, fløte og grønnsakene, og la det småkoke i 8–10 minutter.","Skjær fisken i biter og la den trekke i suppa i 4–5 minutter uten å koke.","Smak til med salt og pepper og dryss over gressløk."]}]},
    {"id":"fiskegryte","name":"Fiskegryte","category":"Fisk","kids":false,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["hvit fisk",500,"g","Kjøl"],["ferdig karrisaus",1,"glass","Tørrvare"],["ris",3,"dl","Tørrvare"],["paprika",1,"stk","Frukt/grønt"],["purre",1,"stk","Frukt/grønt"]],"steps":["Sett risen på kok etter anvisningen på pakken.","Kutt paprika i biter og purre i ringer, og fres dem i litt olje i en gryte.","Hell i karrisausen og kok opp.","Kutt fisken i store biter og legg dem i sausen. La det trekke under lokk i ca. 8 minutter, til fisken flaker seg.","Server gryta med risen."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":25,"servings":4,"passiveMinutes":20,"passiveKind":"koking","ingredients":[["hvit fisk",500,"g","Kjøl"],["løk",1,"stk","Frukt/grønt"],["paprika",1,"stk","Frukt/grønt"],["knuste tomater",1,"boks","Tørrvare"],["kokosmelk",1,"boks","Tørrvare"],["karri",2,"ts","Tørrvare"],["ris",3,"dl","Tørrvare"]],"steps":["Sett risen på kok. Hakk løken og kutt paprikaen i biter.","Fres løk og paprika i litt olje, og rør inn karri.","Hell i knuste tomater og kokosmelk, og la sausen koke i ca. 10 minutter. Smak til med salt.","Kutt fisken i store biter, legg dem i gryta og la dem trekke i ca. 8 minutter på svak varme.","Server med risen."]}]},
    {"id":"torsk-med-bacon","name":"Torsk med bacon","category":"Fisk","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":20,"passiveKind":"ovn","ingredients":[["torskefilet",600,"g","Kjøl"],["bacon",1,"pk","Kjøl"],["poteter",800,"g","Frukt/grønt"],["gulrot",4,"stk","Frukt/grønt"],["smør",50,"g","Meieri"]],"steps":["Sett ovnen på 200 °C. Skrell poteter og gulrøtter og sett dem på kok.","Legg torskefileten i en smurt ildfast form og krydre med salt og pepper.","Klipp baconet i biter, stek det sprøtt i panna og strø det over fisken.","Stek fisken i ovnen i ca. 20 minutter.","Server med poteter, gulrøtter og smeltet smør."]}]},
    {"id":"kokt-torsk","name":"Kokt torsk med gulrøtter","category":"Fisk","kids":false,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":10,"servings":4,"passiveMinutes":20,"passiveKind":"koking","ingredients":[["torskefilet",800,"g","Kjøl"],["poteter",800,"g","Frukt/grønt"],["gulrot",4,"stk","Frukt/grønt"],["smør",100,"g","Meieri"]],"steps":["Skrell poteter og gulrøtter, og kok dem møre i lettsaltet vann i ca. 20 minutter.","Kok opp vann med godt med salt i en vid kjele, og ta kjelen av varmen.","Legg torskestykkene i vannet og la dem trekke i 6–8 minutter, til fisken flaker seg.","Smelt smøret og server over fisk, poteter og gulrøtter."]}]},
    {"id":"plukkfisk","name":"Plukkfisk","category":"Fisk","kids":true,"variants":[{"key":"fra-bunnen","name":"Fra bunnen","minutes":25,"servings":4,"passiveMinutes":20,"passiveKind":"koking","ingredients":[["lettsaltet torsk",600,"g","Kjøl"],["poteter",800,"g","Frukt/grønt"],["melk",5,"dl","Meieri"],["smør",2,"ss","Meieri"],["hvetemel",3,"ss","Tørrvare"],["bacon",1,"pk","Kjøl"],["flatbrød",1,"pk","Tørrvare"]],"steps":["Kok potetene og skjær dem i biter.","Pocher fisken i lettsaltet vann i 5–6 minutter og plukk den i biter.","Lag en hvit saus av smør, mel og melk.","Vend fisk og poteter forsiktig inn i sausen.","Stek bacon sprøtt og server på toppen med gressløk og flatbrød."]}]},
    {"id":"seibiff","name":"Seibiff med løk","category":"Fisk","kids":false,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":20,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["seifilet",600,"g","Kjøl"],["løk",3,"stk","Frukt/grønt"],["hvetemel",1,"dl","Tørrvare"],["poteter",800,"g","Frukt/grønt"],["smør",3,"ss","Meieri"]],"steps":["Kok poteter og gulrøtter.","Skjær løken i ringer og stek den myk i smør. Ta den ut.","Del fisken i stykker, vend i mel med salt og pepper.","Stek fisken i 3–4 minutter på hver side.","Legg løken over og server."]}]},
    {"id":"stekt-makrell","name":"Stekt makrell med agurksalat","category":"Fisk","kids":false,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["makrellfilet",600,"g","Kjøl"],["poteter",800,"g","Frukt/grønt"],["agurk",1,"stk","Frukt/grønt"],["eddik",1,"flaske","Tørrvare"],["rømme",1,"beger","Meieri"]],"steps":["Kok potetene.","Skjær agurken tynt og bland med eddik, sukker og litt vann.","Krydre makrellen med salt og pepper.","Stek fileten i smør, først på skinnsiden, til den er gyllen.","Server med agurksalat og rømme."]}]},
    {"id":"makrell-i-tomat-med-egg-pa-brod","name":"Makrell i tomat med egg på brød","category":"Fisk","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":10,"servings":4,"ingredients":[["makrell i tomat",2,"boks","Tørrvare"],["egg",6,"stk","Meieri"],["grovbrød",1,"stk","Tørrvare"],["agurk",1,"stk","Frukt/grønt"]],"steps":["Kok eggene i ca. 9 minutter, og avkjøl dem i kaldt vann.","Skjær brødskiver og agurk i skiver.","Skrell og del eggene i skiver.","Legg makrell i tomat, egg og agurk på brødskivene."]}]},
    {"id":"fiskesticks-i-wraps","name":"Fiskesticks i wraps","category":"Fisk","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":5,"servings":4,"passiveMinutes":15,"passiveKind":"ovn","ingredients":[["fiskepinner",1,"pk","Frys"],["tortillalefser",1,"pk","Tørrvare"],["isbergsalat",1,"stk","Frukt/grønt"],["mais",1,"boks","Tørrvare"],["dressing",1,"flaske","Kjøl"]],"steps":["Sett ovnen på temperaturen på pakken og stek fiskepinnene i ca. 15 minutter.","Riv isbergsalat og hell av maisen.","Varm tortillalefsene kort i panna.","Fyll lefsene med salat, mais, fiskepinner og dressing, og rull dem sammen."]}]},
    {"id":"fisketaco","name":"Fisketaco","category":"Fisk","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":10,"servings":4,"passiveMinutes":15,"passiveKind":"ovn","ingredients":[["panert fiskefilet",1,"pk","Frys"],["tacolefser",1,"pk","Tørrvare"],["kålsalat",1,"pose","Frukt/grønt"],["lime",1,"stk","Frukt/grønt"],["rømme",1,"beger","Meieri"]],"steps":["Sett ovnen på 220 °C og stek den panerte fisken i ca. 15 minutter.","Press saften av en lime over kålsalaten og bland.","Varm tacolefsene.","Del fisken i biter og fyll lefsene med kålsalat, fisk, rømme og en limebåt."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":30,"servings":4,"ingredients":[["torskefilet",500,"g","Kjøl"],["tacokrydder",1,"pk","Tørrvare"],["tacolefser",1,"pk","Tørrvare"],["rødkål",0.5,"stk","Frukt/grønt"],["lime",1,"stk","Frukt/grønt"],["avokado",2,"stk","Frukt/grønt"],["rømme",1,"beger","Meieri"]],"steps":["Strimle rødkålen tynt og bland med saften av en lime og litt salt.","Mos avokadoen med litt limesaft og salt.","Del torsken i biter, vend dem i tacokrydder og stek dem i olje i 2–3 minutter på hver side.","Varm tacolefsene.","Fyll lefsene med rødkål, fisk, avokado og rømme."]}]},
    {"id":"scampipasta","name":"Scampipasta","category":"Pasta","kids":false,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":20,"servings":4,"ingredients":[["scampi",400,"g","Frys"],["pasta",400,"g","Tørrvare"],["hvitløk",3,"fedd","Frukt/grønt"],["chili",1,"stk","Frukt/grønt"],["matfløte",2,"dl","Meieri"],["persille",1,"bunt","Frukt/grønt"]],"steps":["Kok pastaen i godt saltet vann.","Finhakk hvitløk og chili, og fres dem kort i olje uten at hvitløken tar farge.","Tilsett scampien og stek i 2–3 minutter, til de er rosa.","Hell i matfløten og la sausen koke inn noen minutter. Smak til med salt.","Vend inn pastaen og strø over hakket persille."]}]},
    {"id":"reker-loff","name":"Reker med loff","category":"Fisk","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":10,"servings":4,"ingredients":[["reker",1,"kg","Kjøl"],["loff",1,"stk","Tørrvare"],["majones",1,"stk","Kjøl"],["sitron",1,"stk","Frukt/grønt"],["isbergsalat",1,"stk","Frukt/grønt"]],"steps":["Skjær loffen i skiver.","Skyll og riv isbergsalaten, og del sitronen i båter.","Sett fram rekene, gjerne i en bolle med is under.","Alle legger salat, reker og majones på sin loff, med en dråpe sitron."]}]},
    {"id":"rekesalat-i-pita","name":"Rekesalat i pita","category":"Fisk","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":10,"servings":4,"ingredients":[["reker i lake",2,"boks","Kjøl"],["pitabrød",1,"pk","Tørrvare"],["majones",1,"stk","Kjøl"],["isbergsalat",1,"stk","Frukt/grønt"],["egg",4,"stk","Meieri"]],"steps":["Kok eggene i ca. 9 minutter, avkjøl og hakk dem.","Hell av rekene og bland dem med majones og egg.","Varm pitabrødene i brødrister eller ovn og del dem.","Fyll pitabrødene med isbergsalat og rekesalat."]}]},
    {"id":"sushibowl-med-laks","name":"Sushibowl med laks","category":"Fisk","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":20,"passiveKind":"koking","ingredients":[["laksefilet",400,"g","Kjøl"],["sushiris",3,"dl","Tørrvare"],["agurk",1,"stk","Frukt/grønt"],["avokado",2,"stk","Frukt/grønt"],["edamame",1,"pose","Frys"],["soyasaus",1,"flaske","Tørrvare"]],"steps":["Skyll sushirisen og kok den etter anvisningen, ca. 20 minutter med etterdamping.","Kok edamamebønnene i et par minutter og avkjøl dem.","Kutt laksen i terninger, og agurk og avokado i skiver.","Fordel risen i boller og legg laks, agurk, avokado og edamame oppå.","Drypp over soyasaus."]}]},
    {"id":"bacalao","name":"Bacalao","category":"Fisk","kids":false,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":40,"passiveKind":"koking","ingredients":[["bacalao",1,"pk","Kjøl"],["knuste tomater",2,"boks","Tørrvare"],["poteter",600,"g","Frukt/grønt"],["løk",2,"stk","Frukt/grønt"],["paprika",2,"stk","Frukt/grønt"],["oliven",1,"glass","Tørrvare"]],"steps":["Bacalaoen må være utvannet på forhånd (se pakken). Kutt den i biter.","Kutt løk, paprika og skrelte poteter i skiver.","Legg poteter, løk, paprika og fisk lagvis i en gryte, og hell knuste tomater over.","Tilsett litt vann og la gryta småkoke under lokk i ca. 40 minutter.","Strø over oliven de siste minuttene."]}]},
    {"id":"ovnsbakt-sei-med-pesto","name":"Ovnsbakt sei med pesto","category":"Fisk","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":10,"servings":4,"passiveMinutes":20,"passiveKind":"ovn","ingredients":[["seifilet",600,"g","Kjøl"],["pesto",1,"glass","Tørrvare"],["cherrytomater",1,"beger","Frukt/grønt"],["poteter",800,"g","Frukt/grønt"]],"steps":["Sett ovnen på 200 °C. Kutt potetene i båter og stek dem med litt olje og salt i ca. 20 minutter.","Legg seifileten i en ildfast form og krydre med salt.","Smør pesto over fisken og legg cherrytomater rundt.","Stek fisken sammen med potetene i ca. 20 minutter, til den flaker seg."]}]},
    {"id":"tikka-masala","name":"Kylling tikka masala","category":"Kylling","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["ferdigrett tikka masala",2,"pk","Kjøl"],["naanbrød",1,"pk","Tørrvare"]],"steps":["Varm ferdigretten etter anvisningen på pakken, i mikro eller ovn.","Varm naanbrødene i ovnen eller brødristeren de siste minuttene.","Rør godt i retten før servering.","Server med naanbrødet."]},{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["kyllingfilet",600,"g","Kjøl"],["tikka masala-saus",1,"glass","Tørrvare"],["ris",3,"dl","Tørrvare"],["naanbrød",1,"pk","Tørrvare"]],"steps":["Sett risen på kok.","Kutt kyllingfileten i biter og brun dem i litt olje.","Hell i tikka masala-sausen og la det småkoke i ca. 15 minutter, til kyllingen er gjennomkokt.","Varm naanbrødene og server med ris."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":30,"servings":4,"passiveMinutes":25,"passiveKind":"koking","ingredients":[["kyllingfilet",600,"g","Kjøl"],["yoghurt naturell",1,"beger","Meieri"],["løk",1,"stk","Frukt/grønt"],["hvitløk",3,"fedd","Frukt/grønt"],["ingefær",1,"stk","Frukt/grønt"],["garam masala",2,"ts","Tørrvare"],["knuste tomater",1,"boks","Tørrvare"],["matfløte",2,"dl","Meieri"],["ris",3,"dl","Tørrvare"]],"steps":["Kutt kyllingen i biter og bland den med yoghurt og 1 ts garam masala. La den stå mens du lager sausen.","Hakk løk, hvitløk og ingefær, og fres det mykt i olje. Rør inn resten av garam masalaen.","Hell i knuste tomater og la sausen koke i ca. 10 minutter.","Stek kyllingbitene gylne i en panne og legg dem i sausen sammen med matfløten.","La det småkoke i ca. 15 minutter og smak til med salt.","Kok risen og server."]}]},
    {"id":"butter-chicken","name":"Butter chicken","category":"Kylling","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["ferdigrett butter chicken",2,"pk","Kjøl"],["ris",3,"dl","Tørrvare"]],"steps":["Kok risen etter anvisningen på pakken.","Varm butter chicken-retten etter anvisningen.","Rør godt i retten før servering.","Server over risen."]},{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["kyllingfilet",600,"g","Kjøl"],["butter chicken-saus",1,"glass","Tørrvare"],["ris",3,"dl","Tørrvare"],["naanbrød",1,"pk","Tørrvare"]],"steps":["Sett risen på kok.","Kutt kyllingfileten i biter og stek dem i litt olje til de har fått farge.","Hell i butter chicken-sausen og la det småkoke i ca. 15 minutter.","Varm naanbrødene og server med ris."]}]},
    {"id":"kyllingkarri","name":"Kyllingkarri","category":"Kylling","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["kyllingfilet",600,"g","Kjøl"],["ferdig karrisaus",1,"glass","Tørrvare"],["ris",3,"dl","Tørrvare"],["paprika",1,"stk","Frukt/grønt"]],"steps":["Sett risen på kok.","Kutt kyllingen og paprikaen i biter.","Brun kyllingen i litt olje, og tilsett paprikaen.","Hell i karrisausen og la gryta småkoke i ca. 15 minutter. Server med ris."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":20,"servings":4,"passiveMinutes":20,"passiveKind":"koking","ingredients":[["kyllingfilet",600,"g","Kjøl"],["løk",1,"stk","Frukt/grønt"],["karri",2,"ss","Tørrvare"],["kokosmelk",1,"boks","Tørrvare"],["paprika",1,"stk","Frukt/grønt"],["ris",3,"dl","Tørrvare"]],"steps":["Sett risen på kok. Hakk løken og kutt kylling og paprika i biter.","Fres løken myk i litt olje, og rør inn karri.","Tilsett kyllingen og stek til den har fått farge.","Hell i kokosmelken, tilsett paprika og la gryta småkoke i ca. 20 minutter.","Smak til med salt og server med risen."]}]},
    {"id":"kyllingwok","name":"Kyllingwok","category":"Kylling","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["kyllingstrimler",400,"g","Kjøl"],["frossen wokblanding",1,"pose","Frys"],["woksaus",1,"pose","Tørrvare"],["nudler",1,"pk","Tørrvare"]],"steps":["Kok nudlene etter anvisningen og sil dem.","Stek kyllingstrimlene i litt olje på høy varme i en wok eller stor panne.","Tilsett den frosne wokblandingen og stek i 4–5 minutter.","Vend inn nudler og woksaus og varm alt godt gjennom."]},{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["kyllingfilet",500,"g","Kjøl"],["wokgrønnsaker",1,"pose","Frukt/grønt"],["woksaus",1,"flaske","Tørrvare"],["ris",3,"dl","Tørrvare"]],"steps":["Sett risen på kok.","Kutt kyllingfileten i tynne strimler og stek den på høy varme i litt olje.","Tilsett wokgrønnsakene og stek i 3–4 minutter, så de fortsatt er sprø.","Hell i woksausen, vend godt og server med risen."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":30,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["kyllingfilet",500,"g","Kjøl"],["brokkoli",1,"stk","Frukt/grønt"],["paprika",1,"stk","Frukt/grønt"],["gulrot",2,"stk","Frukt/grønt"],["hvitløk",2,"fedd","Frukt/grønt"],["ingefær",1,"stk","Frukt/grønt"],["soyasaus",1,"flaske","Tørrvare"],["ris",3,"dl","Tørrvare"]],"steps":["Sett risen på kok.","Kutt kyllingen i tynne strimler. Del brokkoli i små buketter og kutt paprika og gulrot i tynne staver.","Finhakk hvitløk og ingefær.","Stek kyllingen på høy varme i en wok, og ta den ut når den er gjennomstekt.","Wok grønnsakene med hvitløk og ingefær i 3–4 minutter, ha kyllingen tilbake og smak til med soyasaus.","Server med risen."]}]},
    {"id":"kylling-i-ovn-med-rotgronnsaker","name":"Kylling i ovn med rotgrønnsaker","category":"Kylling","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":45,"passiveKind":"ovn","ingredients":[["kyllinglår",1,"kg","Kjøl"],["poteter",600,"g","Frukt/grønt"],["gulrot",3,"stk","Frukt/grønt"],["rødløk",2,"stk","Frukt/grønt"],["olivenolje",3,"ss","Tørrvare"]],"steps":["Sett ovnen på 200 °C.","Kutt poteter og gulrot i biter og rødløk i båter, og legg dem i en langpanne.","Vend grønnsakene i olivenolje, salt og pepper, og legg kyllinglårene oppå med skinnsiden opp.","Stek i ca. 45 minutter, til kyllingen er gjennomstekt og skinnet er sprøtt."]}]},
    {"id":"grillet-kylling-fra-butikken","name":"Grillet kylling fra butikken","category":"Kylling","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":10,"servings":4,"ingredients":[["grillet kylling",1,"stk","Kjøl"],["ferdig potetsalat",1,"beger","Kjøl"],["salatmiks",1,"pose","Frukt/grønt"],["agurk",1,"stk","Frukt/grønt"]],"steps":["Del grillkyllingen i porsjonsbiter.","Skyll salatmiksen og kutt agurk i skiver.","Hell potetsalaten i en bolle.","Sett alt på bordet."]}]},
    {"id":"kyllingnuggets-med-potetbater","name":"Kyllingnuggets med potetbåter","category":"Kylling","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":5,"servings":4,"passiveMinutes":20,"passiveKind":"ovn","ingredients":[["frosne kyllingnuggets",1,"pose","Frys"],["frosne potetbåter",1,"pose","Frys"],["agurk",1,"stk","Frukt/grønt"],["dipsaus",1,"flaske","Kjøl"]],"steps":["Sett ovnen på temperaturen som står på pakkene.","Legg potetbåtene på et brett og sett dem i ovnen.","Legg nuggetsene på brettet når potetene har stått i ca. 5 minutter, og stek alt ferdig.","Kutt agurk i staver og server med dipsaus."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":25,"servings":4,"passiveMinutes":25,"passiveKind":"ovn","ingredients":[["kyllingfilet",500,"g","Kjøl"],["cornflakes",1,"pk","Tørrvare"],["egg",2,"stk","Meieri"],["poteter",800,"g","Frukt/grønt"],["gulrot",3,"stk","Frukt/grønt"]],"steps":["Sett ovnen på 220 °C. Skjær potetene i båter, vend dem i litt olje og salt, og legg dem på et brett.","Knus cornflakesen grovt i en pose. Visp egget i en dyp tallerken.","Kutt kyllingfileten i biter, dypp dem i egg og vend dem i cornflakes. Legg dem på et eget brett med bakepapir.","Stek potetbåtene i ca. 25 minutter, og sett inn kyllingen de siste 15 minuttene.","Kutt gulrøttene i staver og server ved siden av."]}]},
    {"id":"kyllingfajitas","name":"Kyllingfajitas","category":"Kylling","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":25,"servings":4,"ingredients":[["kyllingstrimler",500,"g","Kjøl"],["fajitakrydder",1,"pk","Tørrvare"],["tortillalefser",1,"pk","Tørrvare"],["paprika",2,"stk","Frukt/grønt"],["løk",1,"stk","Frukt/grønt"],["rømme",1,"beger","Meieri"],["salsa",1,"glass","Tørrvare"]],"steps":["Kutt paprika og løk i strimler.","Stek kyllingstrimlene på høy varme i litt olje til de er gjennomstekte.","Tilsett paprika, løk og fajitakrydder med en skvett vann, og stek noen minutter til grønnsakene er møre men sprø.","Varm tortillalefsene.","Server fyllet i lefsene med rømme og salsa."]}]},
    {"id":"quesadilla","name":"Quesadilla med kylling","category":"Kylling","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["grillet kyllingkjøtt",1,"pk","Kjøl"],["tortillalefser",1,"pk","Tørrvare"],["revet ost",1,"pk","Meieri"],["salsa",1,"glass","Tørrvare"]],"steps":["Riv kyllingkjøttet i biter.","Strø revet ost, kylling og litt salsa over halvparten av hver tortillalefse, og brett lefsen sammen.","Stek quesadillaene i en tørr panne på middels varme, 2–3 minutter på hver side, til osten har smeltet.","Del dem i trekanter og server med resten av salsaen."]},{"key":"halvferdig","name":"Halvferdig","minutes":25,"servings":4,"ingredients":[["kyllingfilet",400,"g","Kjøl"],["tortillalefser",1,"pk","Tørrvare"],["revet ost",1,"pk","Meieri"],["mais",1,"boks","Tørrvare"],["rømme",1,"beger","Meieri"]],"steps":["Kutt kyllingfileten i små biter, krydre med salt og pepper og stek dem gjennom i litt olje.","Hell av maisen.","Fordel ost, kylling og mais på halvparten av hver lefse og brett den sammen.","Stek i en tørr panne, 2–3 minutter på hver side, til lefsen er sprø og osten har smeltet.","Del i trekanter og server med rømme."]}]},
    {"id":"kyllingenchiladas","name":"Kyllingenchiladas","category":"Kylling","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":20,"servings":4,"passiveMinutes":20,"passiveKind":"ovn","ingredients":[["kyllingfilet",500,"g","Kjøl"],["enchiladasaus",1,"glass","Tørrvare"],["tortillalefser",1,"pk","Tørrvare"],["revet ost",1,"pk","Meieri"],["bønner",1,"boks","Tørrvare"],["rømme",1,"beger","Meieri"]],"steps":["Sett ovnen på 200 °C. Kutt kyllingen i små biter og stek den gjennom i litt olje.","Skyll bønnene og bland dem med kyllingen og halvparten av enchiladasausen.","Fordel fyllet på lefsene, rull dem sammen og legg dem tett i en ildfast form.","Hell resten av sausen over og strø på revet ost.","Stek i ca. 20 minutter og server med rømme."]}]},
    {"id":"kyllingwraps","name":"Kyllingwraps","category":"Kylling","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["grillet kyllingkjøtt",1,"pk","Kjøl"],["tortillalefser",1,"pk","Tørrvare"],["isbergsalat",1,"stk","Frukt/grønt"],["tomat",2,"stk","Frukt/grønt"],["dressing",1,"flaske","Kjøl"]],"steps":["Riv kyllingkjøttet i biter.","Riv isbergsalaten og kutt tomaten i terninger.","Varm tortillalefsene kort i panna.","Fyll lefsene med salat, tomat, kylling og dressing, og rull dem stramt sammen."]}]},
    {"id":"pasta-pesto-kylling","name":"Pasta pesto med kylling","category":"Pasta","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":20,"servings":4,"ingredients":[["kyllingfilet",400,"g","Kjøl"],["pasta",400,"g","Tørrvare"],["grønn pesto",1,"glass","Tørrvare"],["cherrytomater",1,"beger","Frukt/grønt"],["revet parmesan",1,"pk","Meieri"]],"steps":["Kok pastaen i godt saltet vann.","Kutt kyllingfileten i biter og stek dem gyllne og gjennomstekte i litt olje. Krydre med salt og pepper.","Del cherrytomatene i to.","Vend den avrente pastaen med pesto, kylling og tomater.","Strø over revet parmesan."]}]},
    {"id":"kremet-kyllingpasta","name":"Kremet kyllingpasta","category":"Pasta","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":20,"servings":4,"passiveMinutes":10,"passiveKind":"koking","ingredients":[["kyllingfilet",400,"g","Kjøl"],["pasta",400,"g","Tørrvare"],["matfløte",3,"dl","Meieri"],["sjampinjong",250,"g","Frukt/grønt"],["brokkoli",1,"stk","Frukt/grønt"]],"steps":["Sett pastavannet på kok og kok pastaen i ca. 10 minutter.","Kutt kyllingen i biter og sjampinjongen i skiver. Stek kyllingen i litt olje, og tilsett soppen.","Del brokkolien i små buketter og legg dem i pastavannet de siste 3 minuttene.","Hell matfløten i panna og la den koke inn litt. Smak til med salt og pepper.","Vend pasta og brokkoli inn i sausen."]}]},
    {"id":"kylling-satay","name":"Kylling satay med ris","category":"Kylling","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["kyllingfilet",600,"g","Kjøl"],["sataysaus",1,"glass","Tørrvare"],["ris",3,"dl","Tørrvare"],["agurk",1,"stk","Frukt/grønt"]],"steps":["Sett risen på kok.","Kutt kyllingfileten i strimler og stek dem i litt olje.","Hell i sataysausen og la det småkoke i ca. 10 minutter.","Kutt agurken i staver og server med kyllingen og risen."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":25,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["kyllingfilet",600,"g","Kjøl"],["peanøttsmør",4,"ss","Tørrvare"],["kokosmelk",1,"boks","Tørrvare"],["soyasaus",2,"ss","Tørrvare"],["lime",1,"stk","Frukt/grønt"],["ris",3,"dl","Tørrvare"]],"steps":["Kok risen.","Skjær kyllingen i biter og stek den gjennom.","Rør sammen peanøttsmør, kokosmelk, soyasaus og limejuice og varm opp.","Vend kyllingen i sausen.","Server med agurk og salte peanøtter."]}]},
    {"id":"sursot-kylling","name":"Sursøt kylling","category":"Kylling","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":5,"servings":4,"passiveMinutes":20,"passiveKind":"ovn","ingredients":[["frossen panert kylling",1,"pose","Frys"],["sursøt saus",1,"glass","Tørrvare"],["ris",3,"dl","Tørrvare"]],"steps":["Sett ovnen på temperaturen på pakken og stek den panerte kyllingen i ca. 20 minutter.","Kok risen samtidig.","Varm den sursøte sausen i en kjele.","Vend kyllingen i sausen rett før servering, så den holder seg sprø."]},{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["kyllingfilet",500,"g","Kjøl"],["sursøt saus",1,"glass","Tørrvare"],["paprika",1,"stk","Frukt/grønt"],["ananas",1,"boks","Tørrvare"],["ris",3,"dl","Tørrvare"]],"steps":["Sett risen på kok.","Kutt kyllingen og paprikaen i biter, og la ananasen renne av.","Stek kyllingen i litt olje til den har fått farge, og tilsett paprikaen.","Hell i den sursøte sausen og ananasen, og la det koke i ca. 10 minutter. Server med risen."]}]},
    {"id":"kyllingform-brokkoli","name":"Kyllingform med brokkoli","category":"Kylling","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":30,"passiveKind":"ovn","ingredients":[["kyllingfilet",600,"g","Kjøl"],["brokkoli",1,"stk","Frukt/grønt"],["matfløte",3,"dl","Meieri"],["revet ost",1,"pk","Meieri"],["ris",3,"dl","Tørrvare"]],"steps":["Sett ovnen på 200 °C og kok risen.","Skjær kyllingen i biter og stek den lett.","Legg kylling og brokkoli i en form.","Bland fløte og karri, hell over og dryss på ost.","Stek i 25 minutter."]}]},
    {"id":"kyllinglar-ris","name":"Kyllinglår med ris","category":"Kylling","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":10,"servings":4,"passiveMinutes":40,"passiveKind":"ovn","ingredients":[["kyllinglår",1,"kg","Kjøl"],["ris",3,"dl","Tørrvare"],["paprikapulver",2,"ts","Tørrvare"],["agurk",1,"stk","Frukt/grønt"],["rømme",1,"beger","Meieri"]],"steps":["Sett ovnen på 200 °C.","Krydre kyllinglårene med paprika, hvitløk, salt og pepper.","Stek lårene i 40 minutter.","Kok risen og maiskolbene.","Server med rømme."]}]},
    {"id":"kyllingsalat","name":"Kyllingsalat","category":"Kylling","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["grillet kyllingkjøtt",1,"pk","Kjøl"],["salatmiks",1,"pose","Frukt/grønt"],["cherrytomater",1,"beger","Frukt/grønt"],["krutonger",1,"pose","Tørrvare"],["dressing",1,"flaske","Kjøl"]],"steps":["Riv kyllingkjøttet i biter.","Skyll salatmiksen og del cherrytomatene.","Bland salat, tomater og kylling i en stor bolle.","Strø over krutonger og server med dressingen."]}]},
    {"id":"caesarsalat","name":"Cæsarsalat med kylling","category":"Kylling","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":25,"servings":4,"ingredients":[["kyllingfilet",400,"g","Kjøl"],["romanosalat",2,"stk","Frukt/grønt"],["cæsardressing",1,"flaske","Kjøl"],["krutonger",1,"pose","Tørrvare"],["revet parmesan",1,"pk","Meieri"]],"steps":["Stek kyllingen og skjær den i skiver.","Stek bacon sprøtt.","Riv salaten i biter.","Bland salaten med dressing.","Topp med kylling, bacon, krutonger og parmesan."]}]},
    {"id":"grillspyd-kylling","name":"Grillspyd med kylling","category":"Kylling","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":20,"servings":4,"passiveMinutes":20,"passiveKind":"ovn","ingredients":[["kyllingfilet",600,"g","Kjøl"],["paprika",2,"stk","Frukt/grønt"],["rødløk",1,"stk","Frukt/grønt"],["grillspyd",1,"pk","Hus"],["ris",3,"dl","Tørrvare"],["tzatziki",1,"beger","Kjøl"]],"steps":["Skjær kylling og grønnsaker i biter.","Tre bitene på spyd og krydre med salt og pepper.","Grill eller stek spydene i ovn på 225 °C i 15–20 minutter.","Varm pitabrødene.","Server med tzatziki."]}]},
    {"id":"kyllingburger","name":"Kyllingburger","category":"Kylling","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":5,"servings":4,"passiveMinutes":15,"passiveKind":"ovn","ingredients":[["frosne kyllingburgere",1,"pk","Frys"],["hamburgerbrød",1,"pk","Tørrvare"],["isbergsalat",1,"stk","Frukt/grønt"],["tomat",2,"stk","Frukt/grønt"],["dressing",1,"flaske","Kjøl"]],"steps":["Sett ovnen på temperaturen på pakken og stek kyllingburgerne i ca. 15 minutter.","Kutt tomat i skiver og riv isbergsalaten.","Varm brødene i ovnen de siste minuttene.","Bygg burgerne med salat, kyllingburger, tomat og dressing."]}]},
    {"id":"kyllingsuppe","name":"Kyllingsuppe","category":"Suppe","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["posesuppe kyllingsuppe",2,"pose","Tørrvare"],["grillet kyllingkjøtt",1,"pk","Kjøl"]],"steps":["Rør ut posesuppen i vann etter anvisningen og kok den opp.","Riv kyllingkjøttet i små biter.","Legg kyllingen i suppa og la den bli varm i et par minutter.","Smak til med pepper og server."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":20,"servings":4,"passiveMinutes":35,"passiveKind":"koking","ingredients":[["kyllinglår",600,"g","Kjøl"],["kyllingbuljong",1,"l","Tørrvare"],["gulrot",3,"stk","Frukt/grønt"],["purre",1,"stk","Frukt/grønt"],["stangselleri",2,"stk","Frukt/grønt"],["eggnudler",1,"pk","Tørrvare"]],"steps":["Legg kyllinglårene i en gryte med buljong og vann så det dekker, og kok opp. Skum av.","La kyllingen trekke på svak varme i ca. 25 minutter.","Kutt gulrot, purre og stangselleri i biter mens kyllingen koker.","Ta ut kyllingen, plukk kjøttet av beina og legg det tilbake sammen med grønnsakene. Kok i ca. 10 minutter.","Tilsett eggnudlene de siste minuttene og smak til med salt og pepper."]}]},
    {"id":"nudelsuppe","name":"Nudelsuppe med kylling","category":"Suppe","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["nudler med smak",4,"pk","Tørrvare"],["grillet kyllingkjøtt",1,"pk","Kjøl"],["frossen wokblanding",1,"pose","Frys"]],"steps":["Kok opp vann etter anvisningen på nudelpakkene.","Tilsett wokblandingen og kok i 2–3 minutter.","Legg i nudler og smakspose og kok ferdig.","Riv kyllingkjøttet i biter og fordel det over suppa."]},{"key":"halvferdig","name":"Halvferdig","minutes":25,"servings":4,"ingredients":[["kyllingfilet",400,"g","Kjøl"],["kyllingbuljong",1,"l","Tørrvare"],["eggnudler",1,"pk","Tørrvare"],["gulrot",2,"stk","Frukt/grønt"],["vårløk",1,"bunt","Frukt/grønt"],["soyasaus",2,"ss","Tørrvare"]],"steps":["Kok opp buljongen med ingefær og soyasaus.","Ha i kyllingen i strimler og gulrot, og la det trekke i 6–8 minutter.","Ha i pak choi og nudlene.","Kok i 2–3 minutter.","Dryss vårløk over."]}]},
    {"id":"thaisuppe-med-kylling","name":"Thaisuppe med kylling","category":"Suppe","kids":false,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["kyllingfilet",400,"g","Kjøl"],["rød karripasta",1,"glass","Tørrvare"],["kokosmelk",2,"boks","Tørrvare"],["kyllingbuljong",5,"dl","Tørrvare"],["paprika",1,"stk","Frukt/grønt"],["lime",1,"stk","Frukt/grønt"],["risnudler",1,"pk","Tørrvare"]],"steps":["Fres karripastaen i litt olje i en gryte i et minutt.","Hell i kokosmelk og buljong og kok opp.","Kutt kyllingen i tynne strimler og paprikaen i biter. Legg dem i suppa og la det småkoke i ca. 10 minutter.","Legg risnudlene i bløt eller kok dem etter anvisningen, og fordel dem i bollene.","Smak suppa til med limesaft og salt, og hell den over nudlene."]}]},
    {"id":"kjottkaker-i-brun-saus","name":"Kjøttkaker i brun saus","category":"Kjøttdeig","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":10,"servings":4,"passiveMinutes":20,"passiveKind":"koking","ingredients":[["ferdige kjøttkaker",1,"pk","Kjøl"],["brun saus",1,"pk","Tørrvare"],["poteter",800,"g","Frukt/grønt"],["erter",1,"pk","Frys"]],"steps":["Skrell potetene og kok dem møre i ca. 20 minutter.","Lag den brune sausen etter anvisningen på posen.","Legg kjøttkakene i sausen og la dem bli gjennomvarme.","Kok ertene i et par minutter og server alt sammen."]},{"key":"halvferdig","name":"Halvferdig","minutes":10,"servings":4,"passiveMinutes":20,"passiveKind":"koking","ingredients":[["ferdige kjøttkaker",1,"pk","Kjøl"],["brun saus",1,"pk","Tørrvare"],["poteter",800,"g","Frukt/grønt"],["kålstuing",1,"pk","Frys"],["tyttebærsyltetøy",1,"glass","Tørrvare"]],"steps":["Skrell potetene og kok dem møre i ca. 20 minutter.","Lag den brune sausen etter anvisningen, og legg kjøttkakene i sausen til de er varme.","Varm kålstuingen i en egen kjele og rør i den.","Server med poteter og tyttebærsyltetøy."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":40,"servings":4,"passiveMinutes":20,"passiveKind":"koking","ingredients":[["kjøttdeig",500,"g","Kjøl"],["egg",1,"stk","Meieri"],["potetmel",2,"ss","Tørrvare"],["melk",2,"dl","Meieri"],["løk",1,"stk","Frukt/grønt"],["poteter",800,"g","Frukt/grønt"],["smør",2,"ss","Meieri"],["hvetemel",3,"ss","Tørrvare"],["erter",1,"pk","Frys"]],"steps":["Finhakk løken. Bland kjøttdeig, egg, potetmel, melk, løk, salt og pepper til en jevn farse.","Form farsen til kaker med våte hender og brun dem i smør i stekepanna.","Lag brun saus: brun smør og mel i panna, spe med vann og kok til en jevn saus. Smak til med salt og pepper.","Legg kjøttkakene i sausen og la dem småkoke under lokk i ca. 20 minutter. Kok potetene samtidig.","Kok ertene i et par minutter og server."]}]},
    {"id":"kjottboller-tomatsaus","name":"Kjøttboller i tomatsaus","category":"Kjøttdeig","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["ferdige kjøttboller",1,"pk","Kjøl"],["ferdig tomatsaus",1,"glass","Tørrvare"],["pasta",400,"g","Tørrvare"]],"steps":["Kok pastaen i godt saltet vann.","Varm tomatsausen i en kjele.","Legg kjøttbollene i sausen og la dem bli varme i ca. 5 minutter.","Server over pastaen."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":30,"servings":4,"passiveMinutes":20,"passiveKind":"koking","ingredients":[["kjøttdeig",500,"g","Kjøl"],["egg",1,"stk","Meieri"],["griljermel",1,"dl","Tørrvare"],["knuste tomater",2,"boks","Tørrvare"],["løk",1,"stk","Frukt/grønt"],["pasta",400,"g","Tørrvare"]],"steps":["Bland kjøttdeig, egg, griljermel, salt og pepper, og trill små kjøttboller.","Brun kjøttbollene i litt olje og ta dem ut av panna.","Hakk løken og fres den myk, og hell i de knuste tomatene.","Legg kjøttbollene i sausen og la dem småkoke i ca. 20 minutter. Kok pastaen samtidig.","Smak til med salt og pepper og server."]}]},
    {"id":"kjottboller-med-potetmos-og-tyttebaer","name":"Kjøttboller med potetmos og tyttebær","category":"Kjøttdeig","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["ferdige kjøttboller",1,"pk","Kjøl"],["ferdig potetmos",1,"pk","Tørrvare"],["brun saus",1,"pk","Tørrvare"],["tyttebærsyltetøy",1,"glass","Tørrvare"]],"steps":["Varm potetmosen etter anvisningen.","Lag den brune sausen etter anvisningen på posen.","Varm kjøttbollene i sausen.","Server med mos og tyttebærsyltetøy."]},{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":20,"passiveKind":"koking","ingredients":[["ferdige kjøttboller",1,"pk","Kjøl"],["poteter",1,"kg","Frukt/grønt"],["melk",2,"dl","Meieri"],["smør",2,"ss","Meieri"],["fløtesaus",1,"pk","Tørrvare"],["tyttebærsyltetøy",1,"glass","Tørrvare"]],"steps":["Skrell potetene og kok dem møre i ca. 20 minutter.","Varm kjøttbollene i fløtesausen.","Hell av potetene og mos dem med varm melk og smør. Smak til med salt.","Server kjøttboller og saus med mosen og tyttebærsyltetøy."]}]},
    {"id":"hamburgere","name":"Hamburgere","category":"Kjøttdeig","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":20,"servings":4,"ingredients":[["ferdige hamburgere",1,"pk","Kjøl"],["hamburgerbrød",1,"pk","Tørrvare"],["isbergsalat",1,"stk","Frukt/grønt"],["tomat",2,"stk","Frukt/grønt"],["ostskiver",1,"pk","Meieri"],["dressing",1,"flaske","Kjøl"]],"steps":["Stek hamburgerne på middels høy varme, ca. 4 minutter på hver side.","Legg en ostskive på hver burger det siste minuttet.","Kutt tomat i skiver, riv isbergsalaten og varm brødene.","Bygg burgerne med salat, burger, tomat og dressing."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":30,"servings":4,"passiveMinutes":5,"passiveKind":"ovn","ingredients":[["kjøttdeig",600,"g","Kjøl"],["hamburgerbrød",1,"pk","Tørrvare"],["isbergsalat",1,"stk","Frukt/grønt"],["tomat",2,"stk","Frukt/grønt"],["rødløk",1,"stk","Frukt/grønt"],["cheddar",1,"pk","Meieri"],["dressing",1,"flaske","Kjøl"]],"steps":["Stek pommes frites i ovnen etter pakken.","Form kjøttdeigen til burgere og krydre med salt og pepper.","Stek burgerne 3–4 minutter på hver side og legg på ost mot slutten.","Varm brødene.","Bygg burgerne med salat, tomat, rødløk og dressing."]}]},
    {"id":"karbonader","name":"Karbonader med løk og poteter","category":"Kjøttdeig","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":20,"passiveKind":"koking","ingredients":[["ferdige karbonader",1,"pk","Kjøl"],["løk",2,"stk","Frukt/grønt"],["poteter",800,"g","Frukt/grønt"],["brun saus",1,"pk","Tørrvare"],["erter",1,"pk","Frys"]],"steps":["Kok potetene.","Form deigen til karbonader og skjær løken i ringer.","Stek karbonadene i smør, 3–4 minutter på hver side, og ta dem ut.","Stek løken myk i samme panne.","Lag brun saus etter pakken, varm erter og server alt sammen."]}]},
    {"id":"chili-con-carne","name":"Chili con carne","category":"Kjøttdeig","kids":false,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":25,"passiveKind":"koking","ingredients":[["kjøttdeig",400,"g","Kjøl"],["chilikrydder",1,"pk","Tørrvare"],["kidneybønner",1,"boks","Tørrvare"],["knuste tomater",2,"boks","Tørrvare"],["ris",3,"dl","Tørrvare"],["rømme",1,"beger","Meieri"]],"steps":["Stek kjøttdeigen brun i en gryte og rør inn chilikrydderet.","Hell i knuste tomater og skylte kidneybønner.","La gryta småkoke under lokk i ca. 25 minutter.","Kok risen imens.","Smak til med salt og server med ris og rømme."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":25,"servings":4,"passiveMinutes":40,"passiveKind":"koking","ingredients":[["kjøttdeig",400,"g","Kjøl"],["løk",1,"stk","Frukt/grønt"],["hvitløk",2,"fedd","Frukt/grønt"],["paprika",1,"stk","Frukt/grønt"],["kidneybønner",1,"boks","Tørrvare"],["knuste tomater",2,"boks","Tørrvare"],["spisskummen",1,"ts","Tørrvare"],["chilipulver",1,"ts","Tørrvare"],["ris",3,"dl","Tørrvare"],["rømme",1,"beger","Meieri"]],"steps":["Fres hakket løk og hvitløk.","Ha i kjøttdeigen og brun den.","Krydre med chili og spisskummen.","Ha i tomater og bønner og la det småkoke i 20–30 minutter.","Server med ris og rømme."]}]},
    {"id":"kjottdeigsaus-med-ris","name":"Kjøttdeigsaus med ris","category":"Kjøttdeig","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":10,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["kjøttdeig",400,"g","Kjøl"],["mais",1,"boks","Tørrvare"],["ferdig tomatsaus",1,"glass","Tørrvare"],["ris",3,"dl","Tørrvare"],["revet ost",1,"pk","Meieri"]],"steps":["Sett risen på kok.","Stek kjøttdeigen brun.","Hell i tomatsausen og avrent mais, og la det koke i ca. 10 minutter.","Server over risen med revet ost."]}]},
    {"id":"burritos","name":"Burritos","category":"Kjøttdeig","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":20,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["kjøttdeig",400,"g","Kjøl"],["tacokrydder",1,"pk","Tørrvare"],["tortillalefser",1,"pk","Tørrvare"],["ris",2,"dl","Tørrvare"],["bønner",1,"boks","Tørrvare"],["revet ost",1,"pk","Meieri"],["salsa",1,"glass","Tørrvare"]],"steps":["Kok risen.","Stek kjøttdeigen brun og rør inn tacokrydder og vann etter anvisningen.","Skyll bønnene og vend dem inn i kjøttdeigen.","Varm lefsene og fyll dem med ris, kjøttdeig, ost og salsa.","Brett inn sidene og rull burritoene stramt sammen."]}]},
    {"id":"nachos-i-ovn","name":"Nachos i ovn","category":"Kjøttdeig","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":10,"passiveKind":"ovn","ingredients":[["kjøttdeig",400,"g","Kjøl"],["tacokrydder",1,"pk","Tørrvare"],["tortillachips",1,"pose","Tørrvare"],["revet ost",1,"pk","Meieri"],["salsa",1,"glass","Tørrvare"],["rømme",1,"beger","Meieri"],["tomat",2,"stk","Frukt/grønt"]],"steps":["Sett ovnen på 200 °C.","Stek kjøttdeigen og rør inn tacokrydder og vann.","Fordel tortillachips i en ildfast form, legg kjøttdeigen over og strø over revet ost.","Stek i ca. 10 minutter, til osten har smeltet.","Kutt tomat i terninger og server med salsa og rømme."]}]},
    {"id":"tacosuppe","name":"Tacosuppe","category":"Suppe","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":20,"passiveKind":"koking","ingredients":[["kjøttdeig",400,"g","Kjøl"],["tacokrydder",1,"pk","Tørrvare"],["knuste tomater",1,"boks","Tørrvare"],["kjøttbuljong",1,"l","Tørrvare"],["mais",1,"boks","Tørrvare"],["kidneybønner",1,"boks","Tørrvare"],["rømme",1,"beger","Meieri"],["tortillachips",1,"pose","Tørrvare"]],"steps":["Stek kjøttdeigen brun i en gryte og rør inn tacokrydderet.","Hell i knuste tomater og buljong med ca. 5 dl vann, og kok opp.","Skyll kidneybønnene, og tilsett dem og maisen.","La suppa småkoke i ca. 20 minutter.","Server med en klatt rømme og tortillachips."]}]},
    {"id":"moussaka","name":"Moussaka","category":"Kjøttdeig","kids":false,"variants":[{"key":"fra-bunnen","name":"Fra bunnen","minutes":40,"servings":4,"passiveMinutes":45,"passiveKind":"ovn","ingredients":[["kjøttdeig",500,"g","Kjøl"],["aubergine",2,"stk","Frukt/grønt"],["løk",1,"stk","Frukt/grønt"],["knuste tomater",1,"boks","Tørrvare"],["kanel",1,"ts","Tørrvare"],["melk",5,"dl","Meieri"],["smør",2,"ss","Meieri"],["hvetemel",3,"ss","Tørrvare"],["revet ost",1,"pk","Meieri"]],"steps":["Skjær auberginen i skiver, strø på salt og la den stå i 10 minutter. Tørk av og stek skivene gylne i olje.","Hakk løken, fres den myk og tilsett kjøttdeigen. Stek den brun.","Rør inn knuste tomater og kanel, og la sausen koke i ca. 15 minutter. Smak til med salt og pepper.","Lag hvit saus av smør, mel og melk. Sett ovnen på 200 °C.","Legg aubergine og kjøttsaus lagvis i en form, hell over den hvite sausen og strø på revet ost.","Stek i ca. 45 minutter."]}]},
    {"id":"kalruletter","name":"Kålruletter","category":"Kjøttdeig","kids":false,"variants":[{"key":"fra-bunnen","name":"Fra bunnen","minutes":40,"servings":4,"passiveMinutes":30,"passiveKind":"koking","ingredients":[["kjøttdeig",500,"g","Kjøl"],["hodekål",1,"stk","Frukt/grønt"],["poteter",800,"g","Frukt/grønt"],["smør",2,"ss","Meieri"],["melk",3,"dl","Meieri"]],"steps":["Forvell kålbladene i 2–3 minutter, til de er myke.","Bland kjøttdeig med løk, egg, melk og krydder.","Legg fyll på hvert blad og rull sammen.","Kok rulettene i lettsaltet vann i 20–25 minutter.","Lag en saus av smør, mel og kraften, og server med poteter."]}]},
    {"id":"shepherd-s-pie","name":"Shepherd's pie","category":"Kjøttdeig","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":20,"servings":4,"passiveMinutes":25,"passiveKind":"ovn","ingredients":[["kjøttdeig",500,"g","Kjøl"],["ferdig potetmos",1,"pk","Tørrvare"],["frosne grønnsaker",1,"pose","Frys"],["brun saus",1,"pk","Tørrvare"],["revet ost",1,"pk","Meieri"]],"steps":["Sett ovnen på 200 °C.","Stek kjøttdeigen brun og tilsett de frosne grønnsakene.","Rør inn brun saus etter anvisningen og la det koke noen minutter.","Hell kjøttblandingen i en ildfast form og fordel potetmosen over.","Strø over revet ost og stek i ca. 25 minutter."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":40,"servings":4,"passiveMinutes":30,"passiveKind":"ovn","ingredients":[["kjøttdeig",500,"g","Kjøl"],["løk",1,"stk","Frukt/grønt"],["gulrot",2,"stk","Frukt/grønt"],["erter",1,"pk","Frys"],["poteter",1,"kg","Frukt/grønt"],["melk",2,"dl","Meieri"],["smør",2,"ss","Meieri"]],"steps":["Skrell potetene og kok dem møre. Mos dem med varm melk og smør, og smak til med salt.","Hakk løk og gulrot, og fres dem i litt smør.","Tilsett kjøttdeigen, stek den brun og spe med litt vann. La det koke noen minutter og tilsett ertene.","Sett ovnen på 200 °C. Hell kjøttet i en ildfast form og legg mosen over.","Lag striper i mosen med en gaffel og stek i ca. 30 minutter."]}]},
    {"id":"pytt-i-panne","name":"Pytt i panne","category":"Kjøtt","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["frossen pytt i panne",1,"pose","Frys"],["egg",4,"stk","Meieri"],["rødbeter",1,"glass","Tørrvare"]],"steps":["Stek pytten i litt olje i en stor panne etter anvisningen, til den er varm og har fått stekeskorpe.","Stek speilegg i en egen panne.","Skjær rødbetene i skiver.","Server pytten med et speilegg på toppen og rødbeter ved siden av."]},{"key":"halvferdig","name":"Halvferdig","minutes":25,"servings":4,"passiveMinutes":10,"passiveKind":"koking","ingredients":[["poteter",800,"g","Frukt/grønt"],["løk",1,"stk","Frukt/grønt"],["kjøttpålegg eller rester",300,"g","Kjøl"],["egg",4,"stk","Meieri"],["rødbeter",1,"glass","Tørrvare"]],"steps":["Skrell potetene, kutt dem i små terninger og forkok dem i ca. 10 minutter. Hell av.","Hakk løken og kutt kjøttpålegget eller restene i terninger.","Stek poteter, løk og kjøtt i litt olje på høy varme, til potetene er gylne. Smak til med salt og pepper.","Stek speilegg.","Server med speilegg og rødbeter."]}]},
    {"id":"stroganoff","name":"Stroganoff med ris","category":"Kjøtt","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["biffstrimler",500,"g","Kjøl"],["stroganoffsaus",1,"pk","Tørrvare"],["løk",1,"stk","Frukt/grønt"],["sjampinjong",250,"g","Frukt/grønt"],["ris",3,"dl","Tørrvare"]],"steps":["Sett risen på kok.","Hakk løken og kutt sjampinjongen i skiver.","Brun biffstrimlene raskt på høy varme, og tilsett løk og sopp.","Hell i stroganoffsausen og la det småkoke i ca. 10 minutter. Server med risen."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":25,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["storfe indrefilet eller biffkjøtt",500,"g","Kjøl"],["løk",1,"stk","Frukt/grønt"],["sjampinjong",250,"g","Frukt/grønt"],["paprikapulver",2,"ts","Tørrvare"],["tomatpuré",2,"ss","Tørrvare"],["matfløte",3,"dl","Meieri"],["ris",3,"dl","Tørrvare"]],"steps":["Kok risen.","Brun kjøttet raskt i en varm panne og ta det ut.","Fres løk og sopp med paprikapulver og tomatpuré.","Ha i fløten og kjøttet og la det småkoke i 5 minutter.","Ha i sylteagurk i strimler og server."]}]},
    {"id":"biffwok","name":"Biffwok med nudler","category":"Kjøtt","kids":false,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":25,"servings":4,"ingredients":[["biffstrimler",400,"g","Kjøl"],["wokgrønnsaker",1,"pose","Frukt/grønt"],["woksaus",1,"flaske","Tørrvare"],["eggnudler",1,"pk","Tørrvare"]],"steps":["Kok eggnudlene etter anvisningen og sil dem.","Stek biffstrimlene på høy varme i litt olje, og ta dem ut av panna.","Wok grønnsakene i 3–4 minutter.","Ha kjøttet tilbake, vend inn nudler og woksaus og varm alt godt gjennom."]}]},
    {"id":"svinekoteletter","name":"Svinekoteletter med poteter","category":"Kjøtt","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":20,"passiveKind":"koking","ingredients":[["svinekoteletter",4,"stk","Kjøl"],["poteter",800,"g","Frukt/grønt"],["brokkoli",1,"stk","Frukt/grønt"],["ferdig sjysaus",1,"pk","Tørrvare"]],"steps":["Skrell potetene og kok dem møre i ca. 20 minutter.","Krydre kotelettene med salt og pepper og stek dem på middels høy varme, 3–4 minutter på hver side.","Del brokkolien i buketter og kok dem i 3–4 minutter.","Varm sjysausen og server."]}]},
    {"id":"svinefilet-soppsaus","name":"Svinefilet med soppsaus","category":"Kjøtt","kids":false,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":20,"passiveKind":"ovn","ingredients":[["svinefilet",600,"g","Kjøl"],["soppsaus",1,"pk","Tørrvare"],["sjampinjong",250,"g","Frukt/grønt"],["poteter",800,"g","Frukt/grønt"],["grønne bønner",1,"pose","Frys"]],"steps":["Sett ovnen på 180 °C. Skrell og kok potetene.","Brun svinefileten på alle sider i en panne, og stek den ferdig i ovnen i ca. 20 minutter.","Kutt sjampinjongen i skiver, stek den i panna og hell i soppsausen. La den koke litt.","Kok de grønne bønnene i 3–4 minutter.","La kjøttet hvile i 5 minutter, skjær det i skiver og server."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":25,"servings":4,"passiveMinutes":25,"passiveKind":"ovn","ingredients":[["svinefilet",600,"g","Kjøl"],["sjampinjong",250,"g","Frukt/grønt"],["sjalottløk",2,"stk","Frukt/grønt"],["matfløte",3,"dl","Meieri"],["timian",1,"pk","Frukt/grønt"],["poteter",800,"g","Frukt/grønt"]],"steps":["Sett ovnen på 180 °C. Skrell potetene og sett dem på kok.","Krydre svinefileten med salt, pepper og timian, brun den på alle sider og stek den ferdig i ovnen i ca. 25 minutter.","Hakk sjalottløken og kutt sjampinjongen i skiver. Stek dem gylne i panna.","Hell i matfløten, tilsett timian og la sausen koke inn. Smak til med salt og pepper.","La kjøttet hvile i 5 minutter før du skjærer det i skiver."]}]},
    {"id":"sursot-svin","name":"Sursøt svin med ris","category":"Kjøtt","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["svinestrimler",500,"g","Kjøl"],["sursøt saus",1,"glass","Tørrvare"],["paprika",1,"stk","Frukt/grønt"],["ananas",1,"boks","Tørrvare"],["ris",3,"dl","Tørrvare"]],"steps":["Sett risen på kok.","Kutt paprikaen i biter og la ananasen renne av.","Stek svinestrimlene på høy varme i litt olje, og tilsett paprikaen.","Hell i sursøt saus og ananas, og la det koke i ca. 5 minutter. Server med ris."]}]},
    {"id":"schnitzel","name":"Schnitzel med poteter","category":"Kjøtt","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":5,"servings":4,"passiveMinutes":25,"passiveKind":"ovn","ingredients":[["ferdig panert schnitzel",1,"pk","Frys"],["frosne potetbåter",1,"pose","Frys"],["sitron",1,"stk","Frukt/grønt"],["erter",1,"pk","Frys"]],"steps":["Sett ovnen på temperaturen på pakken og stek potetbåtene i ca. 25 minutter.","Stek schnitzlene i litt smør eller olje etter anvisningen, til de er gylne.","Kok ertene i et par minutter.","Server med en sitronbåt."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":30,"servings":4,"passiveMinutes":20,"passiveKind":"koking","ingredients":[["svineschnitzel",4,"stk","Kjøl"],["egg",2,"stk","Meieri"],["griljermel",1,"pk","Tørrvare"],["poteter",800,"g","Frukt/grønt"],["sitron",1,"stk","Frukt/grønt"],["erter",1,"pk","Frys"]],"steps":["Kok potetene.","Bank schnitzlene tynne.","Vend dem i mel, sammenvispet egg og griljermel.","Stek dem gyllne i smør, 2–3 minutter på hver side.","Server med erter og sitron."]}]},
    {"id":"medisterkaker","name":"Medisterkaker med surkål","category":"Kjøtt","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":10,"servings":4,"passiveMinutes":25,"passiveKind":"koking","ingredients":[["medisterkaker",1,"pk","Kjøl"],["ferdig surkål",1,"pk","Kjøl"],["poteter",800,"g","Frukt/grønt"],["brun saus",1,"pk","Tørrvare"]],"steps":["Kok potetene.","Varm surkålen i en kjele på lav varme.","Stek medisterkakene gyllne i panne, eller varm dem i saus.","Lag brun saus etter pakken.","Server med tyttebærsyltetøy."]}]},
    {"id":"pulled-pork-i-brod","name":"Pulled pork i brød","category":"Kjøtt","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":10,"servings":4,"passiveMinutes":10,"passiveKind":"ovn","ingredients":[["ferdig pulled pork",1,"pk","Kjøl"],["hamburgerbrød",1,"pk","Tørrvare"],["kålsalat",1,"beger","Kjøl"]],"steps":["Varm pulled pork etter anvisningen på pakken, i ovn eller kjele.","Varm hamburgerbrødene i ovnen de siste minuttene.","Riv kjøttet litt fra hverandre med to gafler.","Fyll brødene med kjøtt og kålsalat."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":25,"servings":4,"passiveMinutes":300,"passiveKind":"ovn","ingredients":[["svinenakke",1.2,"kg","Kjøl"],["bbq-saus",1,"flaske","Tørrvare"],["hamburgerbrød",1,"pk","Tørrvare"],["hodekål",0.5,"stk","Frukt/grønt"],["gulrot",2,"stk","Frukt/grønt"],["majones",1,"stk","Kjøl"]],"steps":["Sett ovnen på 140 °C. Gni svinenakken med salt og pepper og halvparten av bbq-sausen.","Legg kjøttet i en form med lokk eller folie, og stek i ca. 5 timer, til det faller fra hverandre.","Lag coleslaw: strimle hodekål, riv gulrot og bland med majones og litt salt.","Riv kjøttet med to gafler og bland med resten av bbq-sausen.","Varm brødene og fyll dem med kjøtt og coleslaw."]}]},
    {"id":"lapskaus","name":"Lapskaus","category":"Kjøtt","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["ferdig lapskaus",2,"boks","Tørrvare"],["flatbrød",1,"pk","Tørrvare"]],"steps":["Hell lapskausen i en kjele.","Varm den opp på middels varme under omrøring, til den koker.","Smak til med pepper.","Server med flatbrød."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":25,"servings":4,"passiveMinutes":45,"passiveKind":"koking","ingredients":[["svinekjøtt i terninger",500,"g","Kjøl"],["poteter",800,"g","Frukt/grønt"],["gulrot",3,"stk","Frukt/grønt"],["kålrot",0.5,"stk","Frukt/grønt"],["løk",2,"stk","Frukt/grønt"],["kjøttbuljong",1,"l","Tørrvare"]],"steps":["Brun kjøttet i en gryte og ha i hakket løk.","Hell over buljongen og la det småkoke i 20 minutter.","Skrell poteter, gulrot og kålrot og skjær i terninger.","Ha grønnsakene i gryta og kok til potetene begynner å gå i oppløsning.","Smak til og server med flatbrød."]}]},
    {"id":"kjottsuppe","name":"Kjøttsuppe","category":"Suppe","kids":true,"variants":[{"key":"fra-bunnen","name":"Fra bunnen","minutes":25,"servings":4,"passiveMinutes":120,"passiveKind":"koking","ingredients":[["høyrygg av storfe",800,"g","Kjøl"],["gulrot",4,"stk","Frukt/grønt"],["kålrot",0.5,"stk","Frukt/grønt"],["sellerirot",0.5,"stk","Frukt/grønt"],["purre",1,"stk","Frukt/grønt"],["poteter",600,"g","Frukt/grønt"]],"steps":["Legg kjøttet i en stor gryte, dekk med vann og kok opp. Skum godt.","Ha i salt og pepper og la det småkoke under lokk i ca. 1½ time.","Skrell gulrot, kålrot, sellerirot og poteter, og kutt dem i terninger. Rens purren og kutt den i ringer.","Ha grønnsakene og potetene i gryta og kok til alt er mørt, ca. 25–30 minutter.","Ta ut kjøttet, skjær det i biter og ha det tilbake før servering."]}]},
    {"id":"gulasjsuppe","name":"Gulasjsuppe","category":"Suppe","kids":false,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":25,"passiveKind":"koking","ingredients":[["kjøttdeig eller biffkjøtt",400,"g","Kjøl"],["gulasjsuppe på pose",2,"pose","Tørrvare"],["poteter",4,"stk","Frukt/grønt"],["paprika",1,"stk","Frukt/grønt"]],"steps":["Brun kjøttet i en gryte (kjøttdeig eller biffkjøtt i terninger).","Rør ut suppeposen i vann etter anvisningen og hell over kjøttet.","Skrell potetene og kutt poteter og paprika i terninger. Legg dem i suppa.","La suppa småkoke i ca. 25 minutter, til potetene er møre."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":25,"servings":4,"passiveMinutes":75,"passiveKind":"koking","ingredients":[["biffkjøtt i terninger",500,"g","Kjøl"],["løk",2,"stk","Frukt/grønt"],["paprikapulver",2,"ss","Tørrvare"],["knuste tomater",1,"boks","Tørrvare"],["poteter",4,"stk","Frukt/grønt"],["paprika",2,"stk","Frukt/grønt"],["kjøttbuljong",1,"l","Tørrvare"]],"steps":["Brun kjøttet i en gryte.","Ha i løk, paprika og paprikapulver.","Hell over buljong og tomater og la det småkoke i 40 minutter.","Ha i poteter i terninger og kok til de er møre.","Server med en skje rømme."]}]},
    {"id":"farikal","name":"Fårikål","category":"Kjøtt","kids":false,"variants":[{"key":"fra-bunnen","name":"Fra bunnen","minutes":20,"servings":4,"passiveMinutes":150,"passiveKind":"koking","ingredients":[["fårikålkjøtt",1.5,"kg","Kjøl"],["hodekål",1.5,"kg","Frukt/grønt"],["hel sort pepper",2,"ss","Tørrvare"],["hvetemel",2,"ss","Tørrvare"],["poteter",1,"kg","Frukt/grønt"]],"steps":["Skjær kålen i båter og del kjøttet i passe biter.","Legg kjøtt og kål lagvis i en stor gryte med salt, pepperkorn og litt mel mellom lagene.","Hell på 3–4 dl vann og kok opp.","La det småkoke under lokk i 2–2½ time, til kjøttet løsner fra beinet.","Kok poteter og server."]}]},
    {"id":"kebab-i-pita","name":"Kebab i pita","category":"Kjøtt","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["ferdig kebabkjøtt",1,"pk","Kjøl"],["pitabrød",1,"pk","Tørrvare"],["isbergsalat",1,"stk","Frukt/grønt"],["tomat",2,"stk","Frukt/grønt"],["kebabdressing",1,"flaske","Kjøl"]],"steps":["Stek kebabkjøttet i en tørr panne til det er varmt og litt sprøtt.","Riv isbergsalaten og kutt tomaten i biter.","Varm pitabrødene.","Fyll brødene med salat, tomat, kjøtt og kebabdressing."]}]},
    {"id":"gyros-med-tzatziki","name":"Gyros med tzatziki","category":"Kjøtt","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":25,"servings":4,"ingredients":[["gyroskjøtt",500,"g","Kjøl"],["pitabrød",1,"pk","Tørrvare"],["tzatziki",1,"beger","Kjøl"],["tomat",2,"stk","Frukt/grønt"],["agurk",1,"stk","Frukt/grønt"],["rødløk",1,"stk","Frukt/grønt"]],"steps":["Stek gyroskjøttet på høy varme til det er gjennomstekt og har fått farge.","Kutt tomat og agurk i biter og rødløken i tynne ringer.","Varm pitabrødene.","Fyll brødene med kjøtt, grønnsaker og tzatziki."]}]},
    {"id":"koteletter-av-lam-med-potetgrateng","name":"Koteletter av lam med potetgrateng","category":"Kjøtt","kids":false,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":35,"passiveKind":"ovn","ingredients":[["lammekoteletter",800,"g","Kjøl"],["ferdig potetgrateng",1,"pk","Kjøl"],["brokkoli",1,"stk","Frukt/grønt"]],"steps":["Sett ovnen på temperaturen på pakken og stek potetgratengen i ca. 35 minutter.","Krydre lammekotelettene med salt og pepper.","Stek kotelettene på høy varme, 2–3 minutter på hver side, de siste minuttene før gratengen er ferdig.","Kok brokkolibuketter i 3–4 minutter og server."]}]},
    {"id":"biff-med-bearnaise","name":"Biff med bearnaise","category":"Kjøtt","kids":false,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":20,"passiveKind":"ovn","ingredients":[["storfebiff",4,"stk","Kjøl"],["bearnaisesaus på pose",1,"pose","Tørrvare"],["frosne pommes frites",1,"pose","Frys"],["salat",1,"pose","Frukt/grønt"]],"steps":["Sett ovnen på 220 °C og stek pommes fritesen etter anvisningen, ca. 20 minutter.","Ta biffene ut av kjøleskapet i god tid, og krydre dem med salt og pepper.","Lag bearnaisesausen etter anvisningen på posen.","Stek biffene på høy varme, 2–3 minutter på hver side, og la dem hvile litt.","Server med pommes frites, saus og salat."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":30,"servings":4,"passiveMinutes":25,"passiveKind":"ovn","ingredients":[["storfebiff",4,"stk","Kjøl"],["smør",200,"g","Meieri"],["egg",3,"stk","Meieri"],["estragon",1,"pk","Tørrvare"],["poteter",800,"g","Frukt/grønt"],["salat",1,"pose","Frukt/grønt"]],"steps":["Sett ovnen på 220 °C. Skjær potetene i båter, vend dem i olje og salt, og stek dem i ca. 25 minutter.","Smelt smøret og la det avkjøles litt.","Visp eggeplommene med en skvett vann i en kjele over svak varme til de tykner. Spe med smøret i en tynn stråle under kraftig visping.","Smak sausen til med hakket estragon og salt, og hold den lunken.","Stek biffene på høy varme, 2–3 minutter på hver side, og la dem hvile. Server med potetbåter og salat."]}]},
    {"id":"indrefilet-av-svin-i-ovn","name":"Indrefilet av svin i ovn","category":"Kjøtt","kids":false,"variants":[{"key":"fra-bunnen","name":"Fra bunnen","minutes":20,"servings":4,"passiveMinutes":35,"passiveKind":"ovn","ingredients":[["svinefilet",600,"g","Kjøl"],["bacon",1,"pk","Kjøl"],["poteter",800,"g","Frukt/grønt"],["gulrot",3,"stk","Frukt/grønt"],["rødvinssaus",1,"pk","Tørrvare"]],"steps":["Sett ovnen på 180 °C. Skrell potetene og gulrøttene, kutt dem i biter og legg dem i en langpanne med litt olje og salt.","Krydre svinefileten med pepper og surr baconskivene rundt.","Brun fileten kort i en panne, og legg den oppå grønnsakene.","Stek i ca. 35 minutter, til kjøttet er gjennomstekt.","La kjøttet hvile i 5 minutter, varm rødvinssausen og server."]}]},
    {"id":"polser-i-brod","name":"Pølser i brød","category":"Pølser","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":10,"servings":4,"ingredients":[["grillpølser",1,"pk","Kjøl"],["pølsebrød eller lomper",1,"pk","Tørrvare"],["sennep",1,"stk","Kjøl"],["ketchup",1,"flaske","Tørrvare"],["sprøstekt løk",1,"pose","Tørrvare"]],"steps":["Varm pølsene i vann som så vidt koker, eller grill dem i panna.","Varm pølsebrødene eller lompene.","Sett fram sennep, ketchup og sprøstekt løk.","Alle lager sin egen."]}]},
    {"id":"polsegryte","name":"Pølsegryte","category":"Pølser","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["wienerpølser",1,"pk","Kjøl"],["ferdig tomatsaus",1,"glass","Tørrvare"],["løk",1,"stk","Frukt/grønt"],["paprika",1,"stk","Frukt/grønt"],["ris",3,"dl","Tørrvare"]],"steps":["Sett risen på kok.","Hakk løken og kutt paprikaen og pølsene i biter.","Fres løk og paprika i litt olje, og tilsett pølsene.","Hell i tomatsausen og la gryta småkoke i ca. 10 minutter. Server med risen."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":20,"servings":4,"passiveMinutes":20,"passiveKind":"koking","ingredients":[["wienerpølser",1,"pk","Kjøl"],["løk",1,"stk","Frukt/grønt"],["paprika",2,"stk","Frukt/grønt"],["knuste tomater",2,"boks","Tørrvare"],["matfløte",2,"dl","Meieri"],["paprikapulver",2,"ts","Tørrvare"],["ris",3,"dl","Tørrvare"]],"steps":["Kok risen.","Skjær pølser, løk og paprika i biter.","Stek løk og paprika myk med paprikapulver.","Ha i tomater, fløte og pølser og la det småkoke i 10 minutter.","Smak til og server med ris."]}]},
    {"id":"polsestroganoff","name":"Pølsestroganoff","category":"Pølser","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["wienerpølser",1,"pk","Kjøl"],["stroganoffsaus",1,"pk","Tørrvare"],["løk",1,"stk","Frukt/grønt"],["ris",3,"dl","Tørrvare"]],"steps":["Sett risen på kok.","Hakk løken og kutt pølsene i strimler.","Fres løken myk og stek pølsene med til de har fått farge.","Hell i stroganoffsausen og la det koke i ca. 10 minutter. Server med ris."]}]},
    {"id":"polser-med-potetmos-og-kalstuing","name":"Pølser med potetmos og kålstuing","category":"Pølser","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["wienerpølser",1,"pk","Kjøl"],["ferdig potetmos",1,"pk","Tørrvare"],["kålstuing",1,"pk","Frys"]],"steps":["Varm pølsene i vann som så vidt koker.","Varm potetmosen etter anvisningen.","Varm kålstuingen i en egen kjele under omrøring.","Server pølsene med mos og kålstuing."]},{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":20,"passiveKind":"koking","ingredients":[["wienerpølser",1,"pk","Kjøl"],["poteter",1,"kg","Frukt/grønt"],["melk",2,"dl","Meieri"],["smør",2,"ss","Meieri"],["erter",1,"pk","Frys"]],"steps":["Skrell potetene og kok dem møre i ca. 20 minutter.","Varm pølsene i vann som så vidt koker.","Kok ertene i et par minutter.","Hell av potetene og mos dem med varm melk og smør. Smak til med salt.","Server pølsene med mos og erter."]}]},
    {"id":"polsepasta","name":"Pølsepasta","category":"Pølser","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":10,"servings":4,"passiveMinutes":10,"passiveKind":"koking","ingredients":[["wienerpølser",1,"pk","Kjøl"],["pasta",400,"g","Tørrvare"],["ferdig tomatsaus",1,"glass","Tørrvare"],["revet ost",1,"pk","Meieri"]],"steps":["Kok pastaen i godt saltet vann.","Kutt pølsene i skiver og stek dem i litt olje.","Hell i tomatsausen og varm opp.","Vend inn pastaen og strø over revet ost."]}]},
    {"id":"polse-og-potetgrateng","name":"Pølse- og potetgrateng","category":"Pølser","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":10,"servings":4,"passiveMinutes":35,"passiveKind":"ovn","ingredients":[["wienerpølser",1,"pk","Kjøl"],["ferdig potetgrateng",1,"pk","Kjøl"],["brokkoli",1,"stk","Frukt/grønt"]],"steps":["Sett ovnen på temperaturen på gratengpakken.","Kutt pølsene i skiver og vend dem inn i potetgratengen i en ildfast form.","Stek i ca. 35 minutter, til gratengen er gyllen.","Kok brokkolibuketter i 3–4 minutter og server ved siden av."]}]},
    {"id":"pannekaker-med-bacon","name":"Pannekaker med bacon","category":"Egg og lett","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["ferdig pannekakerøre",1,"kartong","Kjøl"],["bacon",1,"pk","Kjøl"],["syltetøy",1,"glass","Tørrvare"]],"steps":["Rist baconet sprøtt i en panne og legg det på tørkepapir.","Rør ut pannekakerøra etter anvisningen.","Stek tynne pannekaker i baconfettet på middels varme.","Server med bacon og syltetøy."]},{"key":"halvferdig","name":"Halvferdig","minutes":35,"servings":4,"ingredients":[["hvetemel",3,"dl","Tørrvare"],["melk",6,"dl","Meieri"],["egg",3,"stk","Meieri"],["bacon",1,"pk","Kjøl"],["syltetøy",1,"glass","Tørrvare"]],"steps":["Visp mel og halvparten av melken klumpfritt. Rør inn resten av melken, eggene og en klype salt, og la røra svelle i 10 minutter.","Stek baconet sprøtt og legg det på tørkepapir.","Stek tynne pannekaker i litt smør eller baconfett på middels varme.","Server med bacon og syltetøy."]}]},
    {"id":"lapper-med-syltetoy-og-romme","name":"Lapper med syltetøy og rømme","category":"Egg og lett","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":30,"servings":4,"ingredients":[["hvetemel",3,"dl","Tørrvare"],["melk",5,"dl","Meieri"],["egg",2,"stk","Meieri"],["bakepulver",1,"pk","Tørrvare"],["syltetøy",1,"glass","Tørrvare"],["rømme",1,"beger","Meieri"]],"steps":["Bland mel, bakepulver og en klype salt.","Visp inn melk og egg til en tykk, jevn røre.","Stek små, tykke lapper i litt smør på middels varme til de er gylne på begge sider.","Server med syltetøy og rømme."]}]},
    {"id":"vafler-til-middag","name":"Vafler til middag","category":"Egg og lett","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["ferdig vaffelrøre",1,"kartong","Kjøl"],["syltetøy",1,"glass","Tørrvare"],["brunost",1,"stk","Meieri"],["rømme",1,"beger","Meieri"]],"steps":["Rør ut vaffelrøra etter anvisningen og la den svelle i et par minutter.","Varm vaffeljernet og smør det lett.","Stek vaflene gylne, én om gangen, og legg dem på rist så de holder seg sprø.","Server med syltetøy, brunost og rømme."]}]},
    {"id":"ovnsomelett","name":"Ovnsomelett","category":"Egg og lett","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":10,"servings":4,"passiveMinutes":30,"passiveKind":"ovn","ingredients":[["egg",8,"stk","Meieri"],["melk",3,"dl","Meieri"],["skinke",1,"pk","Kjøl"],["paprika",1,"stk","Frukt/grønt"],["revet ost",1,"pk","Meieri"],["grovbrød",1,"stk","Tørrvare"]],"steps":["Sett ovnen på 200 °C.","Pisk egg og melk med salt og pepper.","Skjær skinke, paprika og vårløk og fordel i en smurt form.","Hell over eggeblandingen og dryss på ost.","Stek i 20–25 minutter og server med brød."]}]},
    {"id":"eggerore-med-bacon-og-brod","name":"Eggerøre med bacon og brød","category":"Egg og lett","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["egg",8,"stk","Meieri"],["bacon",1,"pk","Kjøl"],["grovbrød",1,"stk","Tørrvare"],["tomat",3,"stk","Frukt/grønt"]],"steps":["Stek baconet sprøtt og legg det på tørkepapir.","Visp eggene med en skvett vann og litt salt.","Rør eggene sakte i en panne på lav varme til de så vidt har stivnet.","Skjær brød og tomat i skiver og server med eggerøre og bacon."]}]},
    {"id":"toast-i-ovn","name":"Toast i ovn","category":"Egg og lett","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":10,"servings":4,"passiveMinutes":8,"passiveKind":"ovn","ingredients":[["loff",1,"stk","Tørrvare"],["skinke",1,"pk","Kjøl"],["ostskiver",1,"pk","Meieri"],["tomat",2,"stk","Frukt/grønt"],["agurk",1,"stk","Frukt/grønt"]],"steps":["Sett ovnen på 225 °C og legg loffskivene på et brett med bakepapir.","Legg skinke og ostskiver på halvparten av skivene, og lukk med en skive til.","Stek toastene i ca. 8 minutter, snu dem halvveis, til de er gylne og osten har smeltet.","Kutt tomat og agurk i skiver og server ved siden av."]}]},
    {"id":"brodmaltid-med-varm-suppe","name":"Brødmåltid med varm suppe","category":"Egg og lett","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":10,"servings":4,"ingredients":[["posesuppe",2,"pose","Tørrvare"],["grovbrød",1,"stk","Tørrvare"],["pålegg",2,"pk","Kjøl"]],"steps":["Rør ut posesuppen i vann etter anvisningen og kok den opp under omrøring.","La suppa småkoke i tiden som står på posen.","Skjær brødet og sett fram pålegget.","Server suppa med brødskiver."]}]},
    {"id":"risgrot","name":"Risgrøt","category":"Egg og lett","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":10,"servings":4,"ingredients":[["ferdig risgrøt",2,"beger","Kjøl"],["kanel",1,"pk","Tørrvare"],["smør",2,"ss","Meieri"]],"steps":["Hell risgrøten i en kjele.","Varm den på middels varme under jevn omrøring, så den ikke svir seg.","Server med en smørklatt og kanel."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":10,"servings":4,"passiveMinutes":60,"passiveKind":"koking","ingredients":[["grøtris",2,"dl","Tørrvare"],["melk",1,"l","Meieri"],["salt",1,"ts","Tørrvare"],["kanel",1,"pk","Tørrvare"],["smør",2,"ss","Meieri"]],"steps":["Kok opp 3 dl vann med grøtrisen og la det koke til vannet nesten er borte, ca. 10 minutter.","Spe med melken og kok opp under omrøring.","Senk varmen og la grøten småkoke under lokk i ca. 60 minutter. Rør av og til, så den ikke svir seg.","Smak til med salt og server med smør og kanel."]}]},
    {"id":"havregrot-med-baer","name":"Havregrøt med bær","category":"Egg og lett","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":10,"servings":4,"ingredients":[["havregryn",1,"pk","Tørrvare"],["melk",1,"l","Meieri"],["frosne bær",1,"pose","Frys"]],"steps":["Bland havregryn og melk i en kjele (ca. 1 del gryn til 2 deler melk).","Kok opp under omrøring og la grøten småkoke i 3–5 minutter.","Tin bærene kort i mikroen eller rør dem rett inn.","Server grøten med bærene på toppen."]}]},
    {"id":"carbonara","name":"Spaghetti carbonara","category":"Pasta","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["ferdig carbonarasaus",1,"glass","Tørrvare"],["bacon",1,"pk","Kjøl"],["spaghetti",400,"g","Tørrvare"]],"steps":["Kok spaghettien i godt saltet vann.","Stek baconet sprøtt i en panne.","Hell carbonarasausen over baconet og varm den forsiktig.","Vend inn den avrente spaghettien og server."]},{"key":"halvferdig","name":"Halvferdig","minutes":20,"servings":4,"ingredients":[["spaghetti",400,"g","Tørrvare"],["bacon",2,"pk","Kjøl"],["egg",4,"stk","Meieri"],["revet parmesan",1,"pk","Meieri"]],"steps":["Kok spaghettien i godt saltet vann. Ta vare på en kopp av pastavannet.","Stek baconet sprøtt i en stor panne og ta panna av varmen.","Visp egg og revet parmesan sammen med godt med pepper.","Vend den varme spaghettien i panna med baconet, og rør inn eggeblandingen med litt pastavann til en blank saus. Ikke sett panna tilbake på varmen, da skiller eggene seg."]}]},
    {"id":"makaroni-og-ost","name":"Makaroni og ost","category":"Pasta","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":5,"servings":4,"passiveMinutes":15,"passiveKind":"ovn","ingredients":[["ferdig makaroni og ost",2,"pk","Frys"]],"steps":["Sett ovnen på temperaturen som står på pakken.","Ta retten ut av emballasjen og sett den midt i ovnen.","Stek i ca. 15 minutter, til den er varm og boblende.","Rør litt i den før servering."]},{"key":"halvferdig","name":"Halvferdig","minutes":25,"servings":4,"ingredients":[["makaroni",400,"g","Tørrvare"],["revet cheddar",2,"pk","Meieri"],["melk",4,"dl","Meieri"],["smør",2,"ss","Meieri"],["hvetemel",2,"ss","Tørrvare"]],"steps":["Kok makaronien etter anvisningen og sil den.","Smelt smøret i en kjele, rør inn melet og spe med melken litt om gangen.","La sausen koke i ca. 5 minutter, og rør inn den revne cheddaren til den har smeltet.","Smak til med salt og pepper, og vend inn makaronien."]}]},
    {"id":"ovnspasta-skinke","name":"Ovnsbakt pasta med skinke","category":"Pasta","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":25,"passiveKind":"ovn","ingredients":[["pasta",400,"g","Tørrvare"],["skinke i terninger",1,"pk","Kjøl"],["matfløte",3,"dl","Meieri"],["revet ost",1,"pk","Meieri"],["brokkoli",1,"stk","Frukt/grønt"]],"steps":["Sett ovnen på 200 °C. Kok pastaen et par minutter kortere enn anvisningen.","Del brokkolien i små buketter.","Bland pasta, brokkoli, skinketerninger og matfløte i en ildfast form, og smak til med salt og pepper.","Strø over revet ost og stek i ca. 25 minutter, til osten er gyllen."]}]},
    {"id":"pasta-med-tomatsaus-og-kjottboller","name":"Pasta med tomatsaus og kjøttboller","category":"Pasta","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["ferdige kjøttboller",1,"pk","Kjøl"],["ferdig pastasaus",1,"glass","Tørrvare"],["pasta",400,"g","Tørrvare"],["revet ost",1,"pk","Meieri"]],"steps":["Kok pastaen i godt saltet vann.","Varm pastasausen i en kjele.","Legg kjøttbollene i sausen og la dem bli varme i ca. 5 minutter.","Server over pastaen med revet ost."]}]},
    {"id":"tortellini-med-ferdig-saus","name":"Tortellini med ferdig saus","category":"Pasta","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":10,"servings":4,"ingredients":[["fersk tortellini",2,"pk","Kjøl"],["ferdig pastasaus",1,"glass","Tørrvare"],["revet parmesan",1,"pk","Meieri"],["salat",1,"pose","Frukt/grønt"]],"steps":["Kok tortellinien etter anvisningen, vanligvis 2–4 minutter.","Varm pastasausen.","Skyll og riv salaten.","Vend tortellinien i sausen og strø over parmesan."]}]},
    {"id":"pasta-med-tunfisksaus","name":"Pasta med tunfisksaus","category":"Pasta","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["tunfisk",2,"boks","Tørrvare"],["pasta",400,"g","Tørrvare"],["knuste tomater",1,"boks","Tørrvare"],["mais",1,"boks","Tørrvare"]],"steps":["Kok pastaen i godt saltet vann.","Varm de knuste tomatene i en kjele og smak til med salt og pepper.","Hell av tunfisken og maisen, og rør dem inn i tomatsausen.","Vend inn pastaen og server."]}]},
    {"id":"pasta-alfredo-med-kylling","name":"Pasta alfredo med kylling","category":"Pasta","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":20,"servings":4,"passiveMinutes":10,"passiveKind":"koking","ingredients":[["kyllingfilet",400,"g","Kjøl"],["fettuccine",400,"g","Tørrvare"],["matfløte",3,"dl","Meieri"],["revet parmesan",1,"pk","Meieri"],["brokkoli",1,"stk","Frukt/grønt"]],"steps":["Kok fettuccinen i ca. 10 minutter. Legg i brokkolibuketter de siste 3 minuttene.","Kutt kyllingen i strimler og stek den gjennom i litt olje. Krydre med salt og pepper.","Hell matfløten i panna og la den koke inn litt. Rør inn parmesanen.","Vend pasta og brokkoli inn i sausen."]}]},
    {"id":"pastasalat","name":"Pastasalat","category":"Pasta","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":20,"servings":4,"ingredients":[["pasta",400,"g","Tørrvare"],["skinke",1,"pk","Kjøl"],["mais",1,"boks","Tørrvare"],["cherrytomater",1,"beger","Frukt/grønt"],["agurk",1,"stk","Frukt/grønt"],["dressing",1,"flaske","Kjøl"]],"steps":["Kok pastaen, skyll den i kaldt vann og la den renne godt av.","Kutt skinke og agurk i terninger og del cherrytomatene.","Bland pastaen med skinke, mais, tomater og agurk.","Vend inn dressingen rett før servering."]}]},
    {"id":"cannelloni-med-spinat-og-ricotta","name":"Cannelloni med spinat og ricotta","category":"Pasta","kids":false,"variants":[{"key":"fra-bunnen","name":"Fra bunnen","minutes":25,"servings":4,"passiveMinutes":40,"passiveKind":"ovn","ingredients":[["cannellonirør",1,"pk","Tørrvare"],["spinat",1,"pose","Frys"],["ricotta",1,"beger","Meieri"],["pastasaus",1,"glass","Tørrvare"],["revet ost",1,"pk","Meieri"]],"steps":["Sett ovnen på 200 °C.","Fres spinaten i en panne til den faller sammen, og la den renne godt av. Hakk den grovt.","Bland spinat og ricotta, og smak til med salt, pepper og litt revet muskat om du har.","Fyll cannellonirørene med en teskje eller sprøytepose, og legg dem i en ildfast form med litt pastasaus i bunnen.","Hell resten av pastasausen over, strø på revet ost og stek i ca. 40 minutter."]}]},
    {"id":"vegetarlasagne","name":"Vegetarlasagne","category":"Vegetar","kids":false,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":5,"servings":4,"passiveMinutes":50,"passiveKind":"ovn","ingredients":[["frossen vegetarlasagne",2,"pk","Frys"]],"steps":["Sett ovnen på temperaturen som står på pakken.","Ta lasagnen ut av esken og sett den midt i ovnen.","Stek i ca. 50 minutter, til den er varm i midten.","La den hvile et par minutter før du deler den."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":40,"servings":4,"passiveMinutes":45,"passiveKind":"ovn","ingredients":[["lasagneplater",1,"pk","Tørrvare"],["squash",1,"stk","Frukt/grønt"],["aubergine",1,"stk","Frukt/grønt"],["paprika",1,"stk","Frukt/grønt"],["linser røde",2,"dl","Tørrvare"],["knuste tomater",2,"boks","Tørrvare"],["melk",6,"dl","Meieri"],["hvetemel",3,"ss","Tørrvare"],["smør",3,"ss","Meieri"],["revet ost",1,"pk","Meieri"]],"steps":["Skyll de røde linsene. Kutt squash, aubergine og paprika i små terninger og fres dem myke i litt olje.","Tilsett knuste tomater, linser og 2 dl vann, og la sausen småkoke i ca. 15 minutter, til linsene er møre. Smak til med salt og pepper.","Lag hvit saus: smelt smøret, rør inn melet og spe med melken litt om gangen. Kok i 5 minutter.","Sett ovnen på 200 °C. Legg grønnsakssaus, lasagneplater og hvit saus lagvis i en form, og avslutt med hvit saus.","Strø over revet ost og stek i ca. 45 minutter."]}]},
    {"id":"vegetartaco","name":"Vegetartaco","category":"Vegetar","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":25,"servings":4,"ingredients":[["vegetarisk kjøttdeigerstatning",1,"pk","Kjøl"],["tacokrydder",1,"pk","Tørrvare"],["tacolefser",1,"pk","Tørrvare"],["bønner",1,"boks","Tørrvare"],["mais",1,"boks","Tørrvare"],["isbergsalat",1,"stk","Frukt/grønt"],["revet ost",1,"pk","Meieri"],["rømme",1,"beger","Meieri"]],"steps":["Stek kjøttdeigerstatningen i litt olje og rør inn tacokrydder og vann etter anvisningen.","Skyll bønnene og vend dem inn.","Riv isbergsalaten og hell av maisen.","Varm tacolefsene og sett alt fram med revet ost og rømme."]}]},
    {"id":"vegetarburger","name":"Vegetarburger","category":"Vegetar","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":10,"servings":4,"passiveMinutes":10,"passiveKind":"ovn","ingredients":[["frosne vegetarburgere",1,"pk","Frys"],["hamburgerbrød",1,"pk","Tørrvare"],["isbergsalat",1,"stk","Frukt/grønt"],["tomat",2,"stk","Frukt/grønt"],["dressing",1,"flaske","Kjøl"]],"steps":["Sett ovnen på temperaturen på pakken og stek vegetarburgerne i ca. 10 minutter, eller stek dem i panna.","Kutt tomaten i skiver og riv isbergsalaten.","Varm brødene.","Bygg burgerne med salat, burger, tomat og dressing."]}]},
    {"id":"kikertgryte","name":"Kikertgryte","category":"Vegetar","kids":false,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["kikerter",2,"boks","Tørrvare"],["ferdig karrisaus",1,"glass","Tørrvare"],["spinat",1,"pose","Frukt/grønt"],["ris",3,"dl","Tørrvare"]],"steps":["Sett risen på kok.","Skyll kikertene og varm dem i karrisausen.","La gryta småkoke i ca. 10 minutter.","Rør inn spinaten til den faller sammen, og server med risen."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":20,"servings":4,"passiveMinutes":20,"passiveKind":"koking","ingredients":[["kikerter",2,"boks","Tørrvare"],["løk",1,"stk","Frukt/grønt"],["hvitløk",2,"fedd","Frukt/grønt"],["knuste tomater",1,"boks","Tørrvare"],["kokosmelk",1,"boks","Tørrvare"],["karri",2,"ts","Tørrvare"],["spinat",1,"pose","Frukt/grønt"],["ris",3,"dl","Tørrvare"]],"steps":["Kok risen.","Fres løk og hvitløk med karri.","Ha i søtpotet i terninger, tomater og kokosmelk.","La det småkoke i 15 minutter.","Ha i kikerter og spinat og varm gjennom."]}]},
    {"id":"linsesuppe","name":"Linsesuppe","category":"Suppe","kids":false,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":10,"servings":4,"passiveMinutes":25,"passiveKind":"koking","ingredients":[["røde linser",3,"dl","Tørrvare"],["løk",1,"stk","Frukt/grønt"],["gulrot",2,"stk","Frukt/grønt"],["knuste tomater",1,"boks","Tørrvare"],["grønnsaksbuljong",1,"l","Tørrvare"],["grovbrød",1,"stk","Tørrvare"]],"steps":["Fres løk, hvitløk og gulrot med karri.","Ha i linser, tomater, kokosmelk og buljong.","La suppa småkoke i 20 minutter, til linsene er møre.","Kjør suppa jevn med stavmikser hvis du vil.","Smak til med salt og pepper."]}]},
    {"id":"tomatsuppe-med-egg-og-makaroni","name":"Tomatsuppe med egg og makaroni","category":"Suppe","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["posesuppe tomatsuppe",2,"pose","Tørrvare"],["makaroni",2,"dl","Tørrvare"],["egg",4,"stk","Meieri"]],"steps":["Kok eggene i ca. 9 minutter og avkjøl dem i kaldt vann.","Rør ut posesuppen i vann og kok den opp under omrøring.","Tilsett makaronien og kok til den er mør, etter anvisningen.","Del eggene i båter og legg dem i suppa ved servering."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":15,"servings":4,"passiveMinutes":25,"passiveKind":"koking","ingredients":[["knuste tomater",2,"boks","Tørrvare"],["løk",1,"stk","Frukt/grønt"],["grønnsaksbuljong",5,"dl","Tørrvare"],["matfløte",1,"dl","Meieri"],["makaroni",2,"dl","Tørrvare"],["egg",4,"stk","Meieri"]],"steps":["Hakk løken og fres den myk i litt olje i en gryte.","Hell i knuste tomater og buljong med ca. 5 dl vann, og la suppa småkoke i ca. 20 minutter.","Kok eggene i ca. 9 minutter og avkjøl dem.","Kjør suppa jevn med en stavmikser, rør inn matfløten og tilsett makaronien. Kok til makaronien er mør.","Smak til med salt og pepper, og server med eggebåter."]}]},
    {"id":"blomkalsuppe","name":"Blomkålsuppe","category":"Suppe","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["posesuppe blomkålsuppe",2,"pose","Tørrvare"],["grovbrød",1,"stk","Tørrvare"]],"steps":["Rør ut blomkålsuppeposen i vann etter anvisningen.","Kok den opp under omrøring og la den småkoke i tiden som står på posen.","Skjær brødet i skiver.","Server suppa med brødet."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":10,"servings":4,"passiveMinutes":25,"passiveKind":"koking","ingredients":[["blomkål",1,"stk","Frukt/grønt"],["løk",1,"stk","Frukt/grønt"],["grønnsaksbuljong",1,"l","Tørrvare"],["matfløte",2,"dl","Meieri"],["grovbrød",1,"stk","Tørrvare"]],"steps":["Hakk løken og del blomkålen i buketter.","Fres løken myk i litt smør eller olje i en gryte.","Tilsett blomkål og buljong med vann så det dekker, og kok i ca. 20 minutter til blomkålen er helt mør.","Kjør suppa jevn med en stavmikser og rør inn matfløten. Smak til med salt og pepper.","Server med grovbrød."]}]},
    {"id":"potet-purresuppe","name":"Potet- og purresuppe","category":"Suppe","kids":true,"variants":[{"key":"fra-bunnen","name":"Fra bunnen","minutes":15,"servings":4,"passiveMinutes":25,"passiveKind":"koking","ingredients":[["poteter",600,"g","Frukt/grønt"],["purre",2,"stk","Frukt/grønt"],["grønnsaksbuljong",1,"l","Tørrvare"],["matfløte",2,"dl","Meieri"],["bacon",1,"pk","Kjøl"]],"steps":["Skjær poteter, purre og løk i biter.","Fres løk og purre i en kjele.","Ha i poteter og buljong og kok i 15–20 minutter.","Kjør suppa jevn og rør inn fløten.","Stek bacon sprøtt og server på toppen med brød."]}]},
    {"id":"gul-ertesuppe","name":"Gul ertesuppe med flesk","category":"Suppe","kids":false,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["ferdig ertesuppe",2,"boks","Tørrvare"],["wienerpølser",1,"pk","Kjøl"]],"steps":["Hell ertesuppen i en kjele og varm den opp under omrøring.","Kutt pølsene i skiver.","Legg pølsene i suppa og la dem bli varme i et par minutter.","Server varm."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":15,"servings":4,"passiveMinutes":120,"passiveKind":"koking","ingredients":[["gule erter",5,"dl","Tørrvare"],["sideflesk",400,"g","Kjøl"],["løk",1,"stk","Frukt/grønt"],["gulrot",2,"stk","Frukt/grønt"],["kålrot",0.5,"stk","Frukt/grønt"]],"steps":["Bløtlegg ertene kvelden før.","Kok ertene med sideflesk og timian i om lag 1 time. Skum underveis.","Ha i terninger av løk, gulrot og kålrot.","Kok videre til ertene er møre og suppa tykner, 20–30 minutter.","Skjær flesket i biter og server det i suppa."]}]},
    {"id":"gresskarsuppe","name":"Gresskarsuppe","category":"Suppe","kids":false,"variants":[{"key":"fra-bunnen","name":"Fra bunnen","minutes":15,"servings":4,"passiveMinutes":30,"passiveKind":"koking","ingredients":[["gresskar",1,"stk","Frukt/grønt"],["løk",1,"stk","Frukt/grønt"],["kokosmelk",1,"boks","Tørrvare"],["grønnsaksbuljong",5,"dl","Tørrvare"],["ingefær",1,"stk","Frukt/grønt"]],"steps":["Skrell gresskaret, fjern kjernene og kutt kjøttet i terninger. Hakk løken og riv ingefæren.","Fres løk og ingefær myke i litt olje i en gryte.","Tilsett gresskar og buljong med vann så det så vidt dekker, og kok i ca. 25 minutter.","Rør inn kokosmelken og kjør suppa jevn med en stavmikser.","Smak til med salt og pepper."]}]},
    {"id":"brokkolisuppe","name":"Brokkolisuppe","category":"Suppe","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["posesuppe brokkolisuppe",2,"pose","Tørrvare"],["grovbrød",1,"stk","Tørrvare"]],"steps":["Rør brokkolisuppeposen ut i kaldt vann i en kjele, så det ikke blir klumper.","Kok opp under omrøring og la suppa småkoke i tiden som står på posen.","Skjær grovbrødet i skiver mens suppa koker.","Server brokkolisuppa varm med brødet."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":10,"servings":4,"passiveMinutes":20,"passiveKind":"koking","ingredients":[["brokkoli",2,"stk","Frukt/grønt"],["løk",1,"stk","Frukt/grønt"],["grønnsaksbuljong",1,"l","Tørrvare"],["matfløte",2,"dl","Meieri"]],"steps":["Hakk løken og del brokkolien i buketter. Skrell og kutt stilken i biter.","Fres løken myk i litt olje i en gryte.","Tilsett brokkoli og buljong med vann så det dekker, og kok i ca. 15 minutter.","Kjør suppa jevn med en stavmikser, rør inn matfløten og smak til med salt og pepper."]}]},
    {"id":"falafel-pita","name":"Falafel i pita","category":"Vegetar","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":5,"servings":4,"passiveMinutes":15,"passiveKind":"ovn","ingredients":[["frossen falafel",1,"pose","Frys"],["pitabrød",1,"pk","Tørrvare"],["hummus",1,"beger","Kjøl"],["isbergsalat",1,"stk","Frukt/grønt"],["tomat",2,"stk","Frukt/grønt"],["agurk",1,"stk","Frukt/grønt"]],"steps":["Varm falafel i ovnen etter pakken.","Varm pitabrødene.","Skjær salat, tomat og agurk.","Fyll brødene med hummus, grønnsaker og falafel.","Topp med yoghurt."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":40,"servings":4,"passiveMinutes":15,"passiveKind":"ovn","ingredients":[["kikerter",2,"boks","Tørrvare"],["løk",1,"stk","Frukt/grønt"],["persille",1,"bunt","Frukt/grønt"],["spisskummen",1,"ts","Tørrvare"],["pitabrød",1,"pk","Tørrvare"],["hummus",1,"beger","Kjøl"],["agurk",1,"stk","Frukt/grønt"]],"steps":["Skyll og tørk kikertene godt. Kjør dem i en hurtigmikser med løk, persille, spisskummen og salt til en grov masse.","Form massen til små kaker eller boller, ca. 2 ss hver.","Sett ovnen på 220 °C, legg falaflene på et brett med bakepapir og pensle med litt olje.","Stek i ca. 15 minutter, snu dem halvveis.","Varm pitabrødene, kutt agurken i biter og fyll brødene med falafel, hummus og agurk."]}]},
    {"id":"halloumi-med-ovnsbakte-gronnsaker","name":"Halloumi med ovnsbakte grønnsaker","category":"Vegetar","kids":false,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":30,"passiveKind":"ovn","ingredients":[["halloumi",2,"pk","Meieri"],["søtpotet",2,"stk","Frukt/grønt"],["paprika",2,"stk","Frukt/grønt"],["rødløk",2,"stk","Frukt/grønt"],["squash",1,"stk","Frukt/grønt"],["olivenolje",3,"ss","Tørrvare"]],"steps":["Sett ovnen på 220 °C.","Skrell søtpoteten og kutt den, paprika, squash og rødløk i biter.","Vend grønnsakene i olivenolje og salt i en langpanne, og stek i ca. 30 minutter.","Skjær halloumien i skiver og stek dem gylne i en tørr panne, ca. 2 minutter på hver side.","Legg halloumien over grønnsakene og server."]}]},
    {"id":"soppristotto","name":"Sopprisotto","category":"Vegetar","kids":false,"variants":[{"key":"fra-bunnen","name":"Fra bunnen","minutes":35,"servings":4,"passiveMinutes":10,"passiveKind":"koking","ingredients":[["risottoris",3,"dl","Tørrvare"],["sjampinjong",300,"g","Frukt/grønt"],["løk",1,"stk","Frukt/grønt"],["grønnsaksbuljong",1,"l","Tørrvare"],["smør",2,"ss","Meieri"],["parmesan",1,"stk","Meieri"]],"steps":["Kok opp buljongen med vann og hold den varm. Hakk løken og kutt sjampinjongen i skiver.","Stek soppen gyllen i litt smør og ta den ut.","Fres løken myk i smør, tilsett risottorisen og rør til kornene er blanke.","Spe med varm buljong en sleiv om gangen under jevn omrøring, til risen er kremet men har litt bitt, ca. 20 minutter.","Rør inn soppen, en smørklatt og revet parmesan. La risottoen hvile under lokk i noen minutter før servering."]}]},
    {"id":"gronnsakswok-med-tofu","name":"Grønnsakswok med tofu","category":"Vegetar","kids":false,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":25,"servings":4,"ingredients":[["tofu",1,"pk","Kjøl"],["wokgrønnsaker",1,"pose","Frukt/grønt"],["woksaus",1,"flaske","Tørrvare"],["nudler",1,"pk","Tørrvare"]],"steps":["Kok nudlene etter anvisningen og sil dem.","Tørk tofuen godt med tørkepapir og kutt den i terninger.","Stek tofuen gyllen på alle sider i olje på høy varme.","Tilsett wokgrønnsakene og stek i 3–4 minutter.","Vend inn nudler og woksaus og varm alt gjennom."]}]},
    {"id":"pannestekte-nudler-med-egg-og-gronnsaker","name":"Pannestekte nudler med egg og grønnsaker","category":"Vegetar","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["eggnudler",1,"pk","Tørrvare"],["frossen wokblanding",1,"pose","Frys"],["egg",4,"stk","Meieri"],["soyasaus",1,"flaske","Tørrvare"]],"steps":["Kok eggnudlene etter anvisningen og sil dem.","Stek wokblandingen i litt olje på høy varme i 3–4 minutter.","Skyv grønnsakene til side, knekk eggene i panna og rør dem til de stivner.","Vend inn nudlene og smak til med soyasaus."]}]},
    {"id":"bonnegryte-med-ris","name":"Bønnegryte med ris","category":"Vegetar","kids":false,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["bønner i tomatsaus",2,"boks","Tørrvare"],["kidneybønner",1,"boks","Tørrvare"],["løk",1,"stk","Frukt/grønt"],["paprika",1,"stk","Frukt/grønt"],["ris",3,"dl","Tørrvare"],["rømme",1,"beger","Meieri"]],"steps":["Sett risen på kok.","Hakk løken og kutt paprikaen i biter. Fres dem myke i litt olje.","Tilsett bønner i tomatsaus og skylte kidneybønner, og la gryta småkoke i ca. 10 minutter.","Smak til med salt og pepper, og server med ris og rømme."]}]},
    {"id":"ostesmorbrod-og-gronnsakssuppe","name":"Ostesmørbrød og grønnsakssuppe","category":"Vegetar","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":10,"servings":4,"passiveMinutes":5,"passiveKind":"koking","ingredients":[["frossen grønnsakssuppe",1,"pk","Frys"],["grovbrød",1,"stk","Tørrvare"],["ostskiver",1,"pk","Meieri"]],"steps":["Varm grønnsakssuppen i en kjele etter anvisningen, ca. 5 minutter.","Legg ostskiver på brødskivene.","Stek smørbrødene i en panne med lokk eller under ovnsgrillen til osten har smeltet.","Server smørbrødene med suppa."]}]},
    {"id":"pai-med-brokkoli-og-ost","name":"Pai med brokkoli og ost","category":"Vegetar","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":5,"servings":4,"passiveMinutes":30,"passiveKind":"ovn","ingredients":[["frossen pai",2,"stk","Frys"],["salat",1,"pose","Frukt/grønt"]],"steps":["Sett ovnen på temperaturen som står på pakken.","Sett paien midt i ovnen og stek i ca. 30 minutter, til den er gjennomvarm.","Skyll og riv salaten.","Del paien og server med salaten."]},{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":35,"passiveKind":"ovn","ingredients":[["ferdig paideig",1,"pk","Kjøl"],["brokkoli",1,"stk","Frukt/grønt"],["egg",4,"stk","Meieri"],["melk",3,"dl","Meieri"],["revet ost",1,"pk","Meieri"]],"steps":["Sett ovnen på 200 °C. Kle en paiform med paideigen og prikk bunnen med en gaffel.","Del brokkolien i små buketter og forvell dem i 2 minutter.","Visp egg og melk sammen, og smak til med salt og pepper.","Fordel brokkoli og revet ost i paiformen og hell eggeblandingen over.","Stek i ca. 35 minutter, til fyllet har stivnet."]}]},
    {"id":"quiche-med-skinke","name":"Quiche med skinke","category":"Pizza og bakst","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":35,"passiveKind":"ovn","ingredients":[["ferdig paideig",1,"pk","Kjøl"],["skinke i terninger",1,"pk","Kjøl"],["egg",4,"stk","Meieri"],["matfløte",3,"dl","Meieri"],["revet ost",1,"pk","Meieri"],["purre",1,"stk","Frukt/grønt"]],"steps":["Sett ovnen på 200 °C. Kle en paiform med paideigen og prikk bunnen.","Rens purren, kutt den i tynne ringer og fres den myk i litt smør.","Visp egg og matfløte sammen med salt og pepper.","Fordel skinke, purre og revet ost i formen, og hell eggeblandingen over.","Stek i ca. 35 minutter, til fyllet har stivnet og er gyllent."]}]},
    {"id":"calzone","name":"Calzone","category":"Pizza og bakst","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":20,"passiveKind":"ovn","ingredients":[["ferdig pizzadeig",1,"pk","Kjøl"],["pizzasaus",1,"glass","Tørrvare"],["skinke",1,"pk","Kjøl"],["revet ost",1,"pk","Meieri"]],"steps":["Sett ovnen på 220 °C. Del pizzadeigen i fire og kjevle hver del til en rund leiv.","Smør pizzasaus på den ene halvdelen av hver leiv, og legg på skinke og revet ost.","Brett leiven over fyllet og klem kantene godt sammen med en gaffel.","Legg calzonene på et brett med bakepapir, lag et lite hull på toppen og stek i ca. 20 minutter."]}]},
    {"id":"flatbrodpizza-tortillapizza","name":"Flatbrødpizza / tortillapizza","category":"Pizza og bakst","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["tortillalefser",1,"pk","Tørrvare"],["pizzasaus",1,"glass","Tørrvare"],["revet ost",1,"pk","Meieri"],["skinke",1,"pk","Kjøl"]],"steps":["Sett ovnen på 225 °C.","Legg tortillalefsene på et brett og smør på et tynt lag pizzasaus.","Fordel skinke og revet ost over.","Stek i ca. 6–8 minutter, til kanten er sprø og osten har smeltet."]}]},
    {"id":"lefserull-med-kylling","name":"Lefserull med kylling","category":"Pizza og bakst","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["grillet kyllingkjøtt",1,"pk","Kjøl"],["lomper",1,"pk","Tørrvare"],["kremost",1,"beger","Meieri"],["isbergsalat",1,"stk","Frukt/grønt"]],"steps":["Riv kyllingkjøttet i biter og riv isbergsalaten i strimler.","Smør kremost på lompene.","Fordel salat og kylling på lompene.","Rull dem stramt sammen og del dem på skrå."]}]},
    {"id":"baguetter-med-fyll-i-ovn","name":"Baguetter med fyll i ovn","category":"Pizza og bakst","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":5,"servings":4,"passiveMinutes":15,"passiveKind":"ovn","ingredients":[["steikeferdige baguetter",1,"pk","Frys"],["skinke",1,"pk","Kjøl"],["revet ost",1,"pk","Meieri"],["tomat",2,"stk","Frukt/grønt"]],"steps":["Sett ovnen på temperaturen som står på baguettpakken.","Del baguettene på langs og fyll dem med skinke, tomatskiver og revet ost.","Stek i ca. 15 minutter, til brødet er sprøtt og osten har smeltet."]}]},
    {"id":"raspeballer","name":"Raspeballer med sideflesk","category":"Kjøtt","kids":false,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":10,"servings":4,"passiveMinutes":25,"passiveKind":"koking","ingredients":[["ferdige raspeballer",1,"pk","Kjøl"],["sideflesk",400,"g","Kjøl"],["kålrot",0.5,"stk","Frukt/grønt"]],"steps":["Varm raspeballene i lettsaltet vann som så vidt koker, etter anvisningen, ca. 25 minutter.","Skjær sideflesket i skiver og stek det sprøtt i en panne.","Skrell kålroten, kutt den i biter og kok den mør. Mos den med litt av fettet fra flesket.","Server raspeballene med flesk og kålrotstappe."]},{"key":"fra-bunnen","name":"Fra bunnen","minutes":40,"servings":4,"passiveMinutes":50,"passiveKind":"koking","ingredients":[["poteter",1.5,"kg","Frukt/grønt"],["byggmel",3,"dl","Tørrvare"],["hvetemel",1,"dl","Tørrvare"],["sideflesk",500,"g","Kjøl"],["kålrot",1,"stk","Frukt/grønt"]],"steps":["Kok sidefleskene og pølsa i en stor gryte med lettsaltet vann i om lag 30 minutter.","Riv rå poteter fint og bland med byggmel, hvetemel og salt til en fast deig.","Form store baller med våte hender.","Legg ballene i kokende kraft og la dem trekke under lokk i 40–45 minutter.","Kok kålroten til stappe og server med smeltet smør og flesk."]}]},
    {"id":"sodd","name":"Sodd","category":"Kjøtt","kids":false,"variants":[{"key":"fra-bunnen","name":"Fra bunnen","minutes":30,"servings":4,"passiveMinutes":100,"passiveKind":"koking","ingredients":[["lammekjøtt i terninger",600,"g","Kjøl"],["kjøttboller",400,"g","Kjøl"],["gulrot",3,"stk","Frukt/grønt"],["kålrot",0.5,"stk","Frukt/grønt"],["poteter",600,"g","Frukt/grønt"],["flatbrød",1,"pk","Tørrvare"]],"steps":["Kok kjøttet i lettsaltet vann og skum godt.","La det småkoke i om lag 1 time.","Ha i kjøttbollene, gulrot og kålrot i biter.","Kok poteter for seg.","Server med flatbrød."]}]},
    {"id":"stekt-sild","name":"Stekt sild med løk","category":"Fisk","kids":false,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":20,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["sildefilet",600,"g","Kjøl"],["løk",2,"stk","Frukt/grønt"],["rugmel",1,"dl","Tørrvare"],["poteter",800,"g","Frukt/grønt"]],"steps":["Skrell potetene og kok dem møre i ca. 15 minutter.","Skjær løken i ringer og stek den myk og gyllen i smør. Ta den ut av panna.","Krydre sildefileten med salt og pepper og vend den i rugmel.","Stek silda i smør på middels høy varme, ca. 2 minutter på hver side.","Server med løken og potetene."]}]},
    {"id":"kremet-fiskesuppe-med-reker","name":"Kremet fiskesuppe med reker","category":"Suppe","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["ferdig fiskesuppe",1,"l","Kjøl"],["reker",300,"g","Kjøl"],["gressløk",1,"bunt","Frukt/grønt"]],"steps":["Varm fiskesuppen i en kjele under omrøring.","Rens rekene.","Legg rekene i suppa rett før servering, så de bare blir varme.","Strø over klippet gressløk."]}]},
    {"id":"ris-med-kylling-og-gronnsaker-i-ovn","name":"Ris med kylling og grønnsaker i ovn","category":"Kylling","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":10,"servings":4,"passiveMinutes":40,"passiveKind":"ovn","ingredients":[["kyllinglår uten bein",600,"g","Kjøl"],["ris",3,"dl","Tørrvare"],["kyllingbuljong",6,"dl","Tørrvare"],["frosne grønnsaker",1,"pose","Frys"]],"steps":["Sett ovnen på 200 °C.","Fordel risen og de frosne grønnsakene i en ildfast form.","Rør ut buljongen i ca. 6 dl kokende vann og hell den over risen.","Legg kyllinglårene oppå, krydre med salt og pepper, og dekk formen med folie.","Stek i ca. 40 minutter, til risen er mør og kyllingen gjennomstekt. Ta av folien de siste 10 minuttene."]}]},
    {"id":"kyllingspyd-med-pita-og-dip","name":"Kyllingspyd med pita og dip","category":"Kylling","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":10,"servings":4,"passiveMinutes":10,"passiveKind":"ovn","ingredients":[["ferdige kyllingspyd",1,"pk","Kjøl"],["pitabrød",1,"pk","Tørrvare"],["tzatziki",1,"beger","Kjøl"],["agurk",1,"stk","Frukt/grønt"],["tomat",2,"stk","Frukt/grønt"]],"steps":["Sett ovnen på temperaturen på pakken og stek kyllingspydene i ca. 10 minutter.","Kutt agurk og tomat i biter.","Varm pitabrødene de siste minuttene.","Server spydene med pita, grønnsaker og tzatziki."]}]},
    {"id":"kyllingvinger-med-potetbater","name":"Kyllingvinger med potetbåter","category":"Kylling","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":10,"servings":4,"passiveMinutes":35,"passiveKind":"ovn","ingredients":[["kyllingvinger",1,"kg","Kjøl"],["bbq-saus",1,"flaske","Tørrvare"],["frosne potetbåter",1,"pose","Frys"],["gulrot",3,"stk","Frukt/grønt"]],"steps":["Sett ovnen på 220 °C.","Vend kyllingvingene i bbq-saus og legg dem på et brett med bakepapir.","Legg potetbåtene på et eget brett, og stek alt i ca. 35 minutter. Snu vingene halvveis.","Kutt gulrøttene i staver og server ved siden av."]}]},
    {"id":"kyllingschnitzel","name":"Kyllingschnitzel","category":"Kylling","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":5,"servings":4,"passiveMinutes":20,"passiveKind":"ovn","ingredients":[["ferdig panert kyllingschnitzel",1,"pk","Frys"],["frosne potetbåter",1,"pose","Frys"],["agurk",1,"stk","Frukt/grønt"]],"steps":["Sett ovnen på temperaturen på pakkene og legg inn potetbåtene.","Legg kyllingschnitzlene i ovnen når potetene har stått i ca. 5 minutter, og stek alt ferdig.","Kutt agurk i skiver og server ved siden av."]}]},
    {"id":"kyllingpanne-med-paprika-og-ris","name":"Kyllingpanne med paprika og ris","category":"Kylling","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["kyllingstrimler",500,"g","Kjøl"],["paprika",2,"stk","Frukt/grønt"],["løk",1,"stk","Frukt/grønt"],["matfløte",2,"dl","Meieri"],["paprikapulver",2,"ts","Tørrvare"],["ris",3,"dl","Tørrvare"]],"steps":["Sett risen på kok.","Kutt paprika og løk i strimler.","Stek kyllingstrimlene i litt olje, tilsett grønnsakene og strø over paprikapulver.","Hell i matfløten og la det koke inn i ca. 5 minutter. Smak til med salt og server med risen."]}]},
    {"id":"kylling-i-rod-karri","name":"Kylling i rød karri","category":"Kylling","kids":false,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["kyllingfilet",600,"g","Kjøl"],["rød karripasta",1,"glass","Tørrvare"],["kokosmelk",1,"boks","Tørrvare"],["paprika",1,"stk","Frukt/grønt"],["ris",3,"dl","Tørrvare"]],"steps":["Sett risen på kok.","Fres karripastaen i litt olje i et minutt.","Kutt kylling og paprika i biter, og stek kyllingen i karripastaen til den har fått farge.","Hell i kokosmelken, tilsett paprika og la det småkoke i ca. 10 minutter. Server med risen."]}]},
    {"id":"kylling-teriyaki","name":"Kylling teriyaki","category":"Kylling","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["kyllingfilet",600,"g","Kjøl"],["teriyakisaus",1,"flaske","Tørrvare"],["ris",3,"dl","Tørrvare"],["brokkoli",1,"stk","Frukt/grønt"]],"steps":["Sett risen på kok.","Kutt kyllingfileten i biter og stek dem gylne i litt olje.","Hell i teriyakisausen og la den koke inn til kyllingen er blank.","Damp eller kok brokkolibuketter i 3–4 minutter og server med kyllingen og risen."]}]},
    {"id":"kyllinggryte-med-sopp","name":"Kyllinggryte med sopp","category":"Kylling","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":15,"servings":4,"passiveMinutes":15,"passiveKind":"koking","ingredients":[["kyllingfilet",600,"g","Kjøl"],["sjampinjong",250,"g","Frukt/grønt"],["soppsaus",1,"pk","Tørrvare"],["ris",3,"dl","Tørrvare"]],"steps":["Sett risen på kok.","Kutt kyllingen i biter og sjampinjongen i skiver.","Brun kyllingen i litt olje og tilsett soppen.","Hell i soppsausen og la gryta småkoke i ca. 10 minutter. Server med risen."]}]},
    {"id":"wraps-med-pulled-kylling","name":"Wraps med pulled kylling","category":"Kylling","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":20,"servings":4,"ingredients":[["ferdig pulled kylling",1,"pk","Kjøl"],["tortillalefser",1,"pk","Tørrvare"],["kålsalat",1,"beger","Kjøl"],["agurk",1,"stk","Frukt/grønt"]],"steps":["Varm den pulled kyllingen etter anvisningen på pakken.","Kutt agurken i staver.","Varm tortillalefsene kort i panna.","Fyll lefsene med kylling, kålsalat og agurk, og rull dem sammen."]}]},
    {"id":"ovnsbakt-potet-med-fyll","name":"Ovnsbakt potet med fyll","category":"Vegetar","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":10,"servings":4,"passiveMinutes":60,"passiveKind":"ovn","ingredients":[["bakepoteter",4,"stk","Frukt/grønt"],["rømme",1,"beger","Meieri"],["revet ost",1,"pk","Meieri"],["skinke i terninger",1,"pk","Kjøl"],["mais",1,"boks","Tørrvare"]],"steps":["Sett ovnen på 200 °C. Skrubb bakepotetene, prikk dem med en gaffel og legg dem rett på rista.","Stek potetene i ca. 60 minutter, til de er helt møre.","Bland rømme, skinketerninger og mais.","Skjær et kryss i hver potet, klem dem opp og fyll med rømmeblandingen og revet ost."]}]},
    {"id":"fiskekaker-i-pita","name":"Fiskekaker i pita","category":"Fisk","kids":true,"variants":[{"key":"ferdigkjopt","name":"Ferdigkjøpt","minutes":15,"servings":4,"ingredients":[["fiskekaker",600,"g","Kjøl"],["pitabrød",1,"pk","Tørrvare"],["isbergsalat",1,"stk","Frukt/grønt"],["agurk",1,"stk","Frukt/grønt"],["dressing",1,"flaske","Kjøl"]],"steps":["Varm fiskekakene i panna eller ovnen.","Riv isbergsalaten og kutt agurken i biter.","Varm pitabrødene.","Fyll brødene med salat, agurk, fiskekaker og dressing."]}]},
    {"id":"laks-med-nudler-og-gronnsaker","name":"Laks med nudler og grønnsaker","category":"Fisk","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":20,"servings":4,"ingredients":[["laksefilet",400,"g","Kjøl"],["eggnudler",1,"pk","Tørrvare"],["wokgrønnsaker",1,"pose","Frukt/grønt"],["soyasaus",1,"flaske","Tørrvare"]],"steps":["Kok eggnudlene etter anvisningen og sil dem.","Kutt laksen i terninger og stek dem forsiktig i litt olje til de er gjennomstekte. Ta dem ut.","Wok grønnsakene i samme panne i 3–4 minutter.","Vend inn nudler og soyasaus, og legg laksen på toppen."]}]},
    {"id":"torsk-i-form-med-tomat-og-oliven","name":"Torsk i form med tomat og oliven","category":"Fisk","kids":false,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":10,"servings":4,"passiveMinutes":25,"passiveKind":"ovn","ingredients":[["torskefilet",600,"g","Kjøl"],["cherrytomater",1,"beger","Frukt/grønt"],["oliven",1,"glass","Tørrvare"],["poteter",800,"g","Frukt/grønt"]],"steps":["Sett ovnen på 200 °C. Skrell potetene og sett dem på kok.","Legg torskefileten i en smurt ildfast form og krydre med salt og pepper.","Del cherrytomatene og fordel dem og olivenene rundt fisken. Drypp over litt olje.","Stek i ca. 20–25 minutter, til fisken flaker seg. Server med potetene."]}]},
    {"id":"kjottpolse-i-panne-med-poteter","name":"Kjøttpølse i panne med poteter","category":"Pølser","kids":true,"variants":[{"key":"halvferdig","name":"Halvferdig","minutes":10,"servings":4,"passiveMinutes":20,"passiveKind":"koking","ingredients":[["kjøttpølse",1,"stk","Kjøl"],["poteter",800,"g","Frukt/grønt"],["løk",1,"stk","Frukt/grønt"],["brun saus",1,"pk","Tørrvare"]],"steps":["Skrell potetene og kok dem møre i ca. 20 minutter.","Skjær kjøttpølsa i skiver og løken i båter.","Stek pølseskivene og løken i en panne til de har fått farge.","Lag brun saus etter anvisningen og hell den i panna. La det småkoke i noen minutter og server med potetene."]}]},
    {"id":"ovnskylling-rotgronnsaker","name":"Ovnsbakt kylling med rotgrønnsaker","category":"Kylling","kids":true,"variants":[{"key":"fra-bunnen","name":"Fra bunnen","minutes":60,"servings":6,"ingredients":[["kyllinglår",1,"kg","Kjøl"],["poteter",600,"g","Frukt/grønt"],["gulrot",3,"stk","Frukt/grønt"],["pastinakk",2,"stk","Frukt/grønt"],["rødløk",2,"stk","Frukt/grønt"],["olivenolje",3,"ss","Tørrvare"],["rosmarin",1,"pk","Frukt/grønt"],["hvitløk",4,"fedd","Frukt/grønt"]],"steps":["Sett ovnen på 200 °C.","Skrell og del poteter og rotgrønnsaker i biter, og del løken i båter.","Bland grønnsakene med olje, hvitløk, rosmarin, salt og pepper i en langpanne.","Legg kyllinglårene oppå og krydre dem.","Stek i 45–50 minutter, til kyllingen er gjennomstekt."]}]},
    {"id":"hjemmelaget-pizza","name":"Hjemmelaget pizza","category":"Pizza og bakst","kids":true,"variants":[{"key":"fra-bunnen","name":"Fra bunnen","minutes":60,"servings":4,"ingredients":[["hvetemel",6,"dl","Tørrvare"],["tørrgjær",1,"pk","Tørrvare"],["olivenolje",2,"ss","Tørrvare"],["pizzasaus",1,"glass","Tørrvare"],["revet ost",2,"pk","Kjøl"],["skinke",1,"pk","Kjøl"],["champignon",250,"g","Frukt/grønt"],["paprika",1,"stk","Frukt/grønt"]],"steps":["Bland mel, gjær, olje, salt og 3 dl lunkent vann til en deig. La den heve i 30 minutter.","Sett ovnen på 250 °C.","Kjevle ut deigen på et bakepapir.","Smør på pizzasaus og legg på skinke, sopp, paprika og ost.","Stek nederst i ovnen i 10–12 minutter."]}]},
    {"id":"ovnstorsk-bacon","name":"Ovnsbakt torsk med bacon","category":"Fisk","kids":true,"variants":[{"key":"fra-bunnen","name":"Fra bunnen","minutes":35,"servings":6,"ingredients":[["torskeloins",600,"g","Kjøl"],["bacon",1,"pk","Kjøl"],["poteter",800,"g","Frukt/grønt"],["gulrot",3,"stk","Frukt/grønt"],["ertebelger",200,"g","Frukt/grønt"],["smør",100,"g","Kjøl"]],"steps":["Sett ovnen på 200 °C og kok poteter og gulrøtter.","Legg torsken i en form og krydre den.","Legg bacon over fisken.","Stek i 15–20 minutter.","Kok ertebelgene raskt og server med smør."]}]},
    {"id":"kyllingnuggets","name":"Hjemmelagde kyllingnuggets","category":"Kylling","kids":true,"variants":[{"key":"fra-bunnen","name":"Fra bunnen","minutes":35,"servings":4,"ingredients":[["kyllingfilet",600,"g","Kjøl"],["egg",2,"stk","Kjøl"],["cornflakes",3,"dl","Tørrvare"],["hvetemel",0.5,"dl","Tørrvare"],["søtpotet",2,"stk","Frukt/grønt"],["agurk",1,"stk","Frukt/grønt"],["ketchup",1,"flaske","Tørrvare"]],"steps":["Sett ovnen på 220 °C og skjær søtpoteten i båter.","Skjær kyllingen i biter og knus cornflakes.","Vend kyllingen i mel, egg og cornflakes.","Stek nuggets og søtpotet på brett i 18–20 minutter.","Server med agurk og ketchup."]}]},
    {"id":"halloumi-ovnsgronnsaker","name":"Ovnsbakte grønnsaker med halloumi","category":"Vegetar","kids":true,"variants":[{"key":"fra-bunnen","name":"Fra bunnen","minutes":40,"servings":4,"ingredients":[["halloumi",2,"pk","Kjøl"],["søtpotet",2,"stk","Frukt/grønt"],["rødløk",2,"stk","Frukt/grønt"],["paprika",2,"stk","Frukt/grønt"],["squash",1,"stk","Frukt/grønt"],["olivenolje",3,"ss","Tørrvare"],["couscous",3,"dl","Tørrvare"]],"steps":["Sett ovnen på 220 °C.","Skjær grønnsakene i biter og bland med olje, salt og pepper.","Stek i 25 minutter.","Legg halloumi i skiver oppå og stek i 10 minutter til.","Lag couscous etter pakken og server."]}]}
  ];
  // END DISHES
})();
