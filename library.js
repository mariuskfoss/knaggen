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
})();
