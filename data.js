// Kraje, ligi i kluby z prawdziwymi składami ładowane są z plików data/*.js (COUNTRY_DATA.push(...)).
const COUNTRY_DATA = [];
// Dane gry: kraje, ligi, kluby, reprezentacje i pule nazwisk.
// Krotka klubu: [nazwa, skrót, kolor główny, kolor drugi, reputacja 1-100, pojemność stadionu]

const NATIONS = [
  { code:'FRA', name:'Francja', flag:'🇫🇷', pool:'FR', str:92, conf:'UEFA' },
  { code:'ESP', name:'Hiszpania', flag:'🇪🇸', pool:'ES', str:92, conf:'UEFA' },
  { code:'ENG', name:'Anglia', flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', pool:'EN', str:90, conf:'UEFA' },
  { code:'POR', name:'Portugalia', flag:'🇵🇹', pool:'PT', str:87, conf:'UEFA' },
  { code:'NED', name:'Holandia', flag:'🇳🇱', pool:'NL', str:85, conf:'UEFA' },
  { code:'GER', name:'Niemcy', flag:'🇩🇪', pool:'DE', str:86, conf:'UEFA' },
  { code:'ITA', name:'Włochy', flag:'🇮🇹', pool:'IT', str:83, conf:'UEFA' },
  { code:'BEL', name:'Belgia', flag:'🇧🇪', pool:'NL', str:82, conf:'UEFA' },
  { code:'CRO', name:'Chorwacja', flag:'🇭🇷', pool:'BALK', str:80, conf:'UEFA' },
  { code:'TUR', name:'Turcja', flag:'🇹🇷', pool:'TR', str:76, conf:'UEFA' },
  { code:'SUI', name:'Szwajcaria', flag:'🇨🇭', pool:'DE', str:76, conf:'UEFA' },
  { code:'DEN', name:'Dania', flag:'🇩🇰', pool:'NORD', str:76, conf:'UEFA' },
  { code:'AUT', name:'Austria', flag:'🇦🇹', pool:'DE', str:76, conf:'UEFA' },
  { code:'NOR', name:'Norwegia', flag:'🇳🇴', pool:'NORD', str:75, conf:'UEFA' },
  { code:'UKR', name:'Ukraina', flag:'🇺🇦', pool:'UA', str:73, conf:'UEFA' },
  { code:'SRB', name:'Serbia', flag:'🇷🇸', pool:'BALK', str:72, conf:'UEFA' },
  { code:'POL', name:'Polska', flag:'🇵🇱', pool:'PL', str:72, conf:'UEFA' },
  { code:'SWE', name:'Szwecja', flag:'🇸🇪', pool:'NORD', str:71, conf:'UEFA' },
  { code:'CZE', name:'Czechy', flag:'🇨🇿', pool:'CZ', str:70, conf:'UEFA' },
  { code:'SCO', name:'Szkocja', flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿', pool:'EN', str:69, conf:'UEFA' },
  { code:'HUN', name:'Węgry', flag:'🇭🇺', pool:'HU', str:69, conf:'UEFA' },
  { code:'GRE', name:'Grecja', flag:'🇬🇷', pool:'GR', str:68, conf:'UEFA' },
  { code:'WAL', name:'Walia', flag:'🏴󠁧󠁢󠁷󠁬󠁳󠁿', pool:'EN', str:67, conf:'UEFA' },
  { code:'SVK', name:'Słowacja', flag:'🇸🇰', pool:'CZ', str:66, conf:'UEFA' },
  { code:'SVN', name:'Słowenia', flag:'🇸🇮', pool:'BALK', str:64, conf:'UEFA' },
  { code:'ROU', name:'Rumunia', flag:'🇷🇴', pool:'RO', str:65, conf:'UEFA' },
  { code:'IRL', name:'Irlandia', flag:'🇮🇪', pool:'EN', str:63, conf:'UEFA' },
  { code:'GEO', name:'Gruzja', flag:'🇬🇪', pool:'GE', str:64, conf:'UEFA' },
  { code:'ALB', name:'Albania', flag:'🇦🇱', pool:'AL', str:61, conf:'UEFA' },
  { code:'BIH', name:'Bośnia i Hercegowina', flag:'🇧🇦', pool:'BALK', str:60, conf:'UEFA' },
  { code:'ISR', name:'Izrael', flag:'🇮🇱', pool:'IL', str:58, conf:'UEFA' },
  { code:'ISL', name:'Islandia', flag:'🇮🇸', pool:'NORD', str:57, conf:'UEFA' },
  { code:'NIR', name:'Irlandia Północna', flag:'🇬🇧', pool:'EN', str:57, conf:'UEFA' },
  { code:'FIN', name:'Finlandia', flag:'🇫🇮', pool:'NORD', str:56, conf:'UEFA' },
  { code:'BUL', name:'Bułgaria', flag:'🇧🇬', pool:'BG', str:54, conf:'UEFA' },
  { code:'MKD', name:'Macedonia Północna', flag:'🇲🇰', pool:'BALK', str:55, conf:'UEFA' },
  { code:'MNE', name:'Czarnogóra', flag:'🇲🇪', pool:'BALK', str:53, conf:'UEFA' },
  { code:'BRA', name:'Brazylia', flag:'🇧🇷', pool:'BR', str:89, conf:'CONMEBOL' },
  { code:'ARG', name:'Argentyna', flag:'🇦🇷', pool:'LATAM', str:91, conf:'CONMEBOL' },
  { code:'URU', name:'Urugwaj', flag:'🇺🇾', pool:'LATAM', str:80, conf:'CONMEBOL' },
  { code:'COL', name:'Kolumbia', flag:'🇨🇴', pool:'LATAM', str:79, conf:'CONMEBOL' },
  { code:'ECU', name:'Ekwador', flag:'🇪🇨', pool:'LATAM', str:74, conf:'CONMEBOL' },
  { code:'USA', name:'USA', flag:'🇺🇸', pool:'EN', str:72, conf:'CONCACAF' },
  { code:'MEX', name:'Meksyk', flag:'🇲🇽', pool:'LATAM', str:72, conf:'CONCACAF' },
  { code:'JPN', name:'Japonia', flag:'🇯🇵', pool:'JP', str:77, conf:'AFC' },
  { code:'KOR', name:'Korea Południowa', flag:'🇰🇷', pool:'KR', str:71, conf:'AFC' },
  { code:'AUS', name:'Australia', flag:'🇦🇺', pool:'EN', str:65, conf:'AFC' },
  { code:'MAR', name:'Maroko', flag:'🇲🇦', pool:'ARAB', str:80, conf:'CAF' },
  { code:'SEN', name:'Senegal', flag:'🇸🇳', pool:'FRAF', str:75, conf:'CAF' },
  { code:'NGA', name:'Nigeria', flag:'🇳🇬', pool:'WAF', str:70, conf:'CAF' },
  { code:'CIV', name:'Wybrzeże Kości Słoniowej', flag:'🇨🇮', pool:'FRAF', str:71, conf:'CAF' },
  { code:'GHA', name:'Ghana', flag:'🇬🇭', pool:'WAF', str:64, conf:'CAF' },
  { code:'CMR', name:'Kamerun', flag:'🇨🇲', pool:'FRAF', str:65, conf:'CAF' },
  { code:'EGY', name:'Egipt', flag:'🇪🇬', pool:'ARAB', str:67, conf:'CAF' },
  { code:'ALG', name:'Algieria', flag:'🇩🇿', pool:'ARAB', str:68, conf:'CAF' }
];

const NAME_POOLS = {
  PL: {
    f:['Jakub','Kacper','Mateusz','Bartosz','Kamil','Łukasz','Michał','Piotr','Paweł','Tomasz','Krzysztof','Marcin','Dawid','Damian','Adrian','Szymon','Filip','Wojciech','Maciej','Rafał','Grzegorz','Sebastian','Patryk','Dominik','Hubert','Igor','Oskar','Karol','Przemysław','Arkadiusz','Mariusz','Konrad','Norbert','Radosław','Jan','Antoni','Wiktor','Miłosz','Aleksander','Daniel','Jarosław','Artur'],
    l:['Nowak','Kowalski','Wiśniewski','Wójcik','Kowalczyk','Kamiński','Lewandowski','Zieliński','Szymański','Woźniak','Dąbrowski','Kozłowski','Jankowski','Mazur','Kwiatkowski','Krawczyk','Piotrowski','Grabowski','Nowakowski','Pawłowski','Michalski','Nowicki','Adamczyk','Dudek','Zając','Wieczorek','Jabłoński','Król','Majewski','Olszewski','Jaworski','Wróbel','Malinowski','Pawlak','Witkowski','Walczak','Stępień','Górski','Rutkowski','Michalak','Sikora','Ostrowski','Baran','Duda','Szewczyk','Tomaszewski','Pietrzak','Marciniak','Wróblewski','Zalewski','Jakubowski','Jasiński','Zawadzki','Sadowski','Bąk','Chmielewski','Włodarczyk','Borkowski','Czarnecki','Sawicki','Sokołowski','Urbański','Kubiak','Maciejewski','Szczepański','Kucharski','Wilk','Kalinowski','Lis','Mazurek','Wysocki','Adamski','Kaźmierczak','Ślusarczyk','Żurawski']
  },
  EN: {
    f:['Jack','Harry','George','Oliver','James','Thomas','William','Charlie','Joshua','Daniel','Samuel','Joe','Ben','Callum','Connor','Ryan','Luke','Kyle','Liam','Jordan','Lewis','Jamie','Aaron','Nathan','Dylan','Ethan','Mason','Owen','Rhys','Sean','Declan','Patrick','Tyler','Cameron'],
    l:['Smith','Jones','Taylor','Brown','Williams','Wilson','Johnson','Davies','Robinson','Wright','Thompson','Evans','Walker','White','Roberts','Green','Hall','Wood','Jackson','Clarke','Hughes','Edwards','Turner','Harris','Cooper','Hill','Ward','Morris','Moore','Clark','Lee','King','Baker','Harrison','Morgan','Allen','Mitchell','Kelly','Murphy','O\'Brien','Campbell','Stewart','Fraser','McGregor','Reid']
  },
  ES: {
    f:['Alejandro','Pablo','Daniel','Javier','Sergio','Álvaro','Adrián','David','Diego','Mario','Carlos','Iker','Hugo','Marcos','Rubén','Raúl','Iván','Jorge','Óscar','Unai','Aitor','Gonzalo','Fernando','Íñigo','Víctor','Nacho','Borja','Mikel','Jesús','Andrés'],
    l:['García','Fernández','González','Rodríguez','López','Martínez','Sánchez','Pérez','Gómez','Martín','Jiménez','Ruiz','Hernández','Díaz','Moreno','Muñoz','Álvarez','Romero','Alonso','Gutiérrez','Navarro','Torres','Domínguez','Vázquez','Ramos','Gil','Ramírez','Serrano','Blanco','Molina','Morales','Suárez','Ortega','Delgado','Castro','Ortiz','Rubio','Marín','Sanz','Iglesias','Aguirre','Etxeberria']
  },
  IT: {
    f:['Alessandro','Lorenzo','Matteo','Francesco','Andrea','Davide','Federico','Riccardo','Marco','Luca','Simone','Gabriele','Giuseppe','Antonio','Giovanni','Stefano','Nicolò','Mattia','Tommaso','Filippo','Daniele','Emanuele','Leonardo','Pietro','Samuele','Giacomo','Michele','Raffaele','Salvatore','Fabio'],
    l:['Rossi','Russo','Ferrari','Esposito','Bianchi','Romano','Colombo','Ricci','Marino','Greco','Bruno','Gallo','Conti','De Luca','Mancini','Costa','Giordano','Rizzo','Lombardi','Moretti','Barbieri','Fontana','Santoro','Mariani','Rinaldi','Caruso','Ferrara','Galli','Martini','Leone','Longo','Gentile','Martinelli','Vitale','Serra','Coppola','De Santis','Fabbri','Bellini','Pellegrini']
  },
  DE: {
    f:['Lukas','Leon','Jonas','Maximilian','Felix','Niklas','Florian','Tim','Jan','Tobias','Julian','Moritz','Paul','Fabian','Sebastian','Dominik','Kevin','Marcel','Patrick','Philipp','Stefan','Christoph','Benedikt','Kai','Nico','Lars','Yannick','Matthias','Robin','Marvin'],
    l:['Müller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Schulz','Hoffmann','Schäfer','Koch','Bauer','Richter','Klein','Wolf','Schröder','Neumann','Schwarz','Zimmermann','Braun','Krüger','Hofmann','Hartmann','Lange','Schmitt','Werner','Schmitz','Krause','Meier','Lehmann','Köhler','Huber','Kaiser','Fuchs','Gruber','Brunner','Steiner','Keller','Frei']
  },
  FR: {
    f:['Lucas','Hugo','Louis','Théo','Mathis','Nathan','Enzo','Raphaël','Antoine','Maxime','Alexandre','Thomas','Clément','Julien','Romain','Quentin','Kévin','Florian','Benjamin','Adrien','Valentin','Baptiste','Jérémy','Mathieu','Nicolas','Pierre','Bastien','Corentin','Yanis','Rayan'],
    l:['Martin','Bernard','Dubois','Thomas','Robert','Richard','Petit','Durand','Leroy','Moreau','Simon','Laurent','Lefebvre','Michel','Garcia','David','Bertrand','Roux','Vincent','Fournier','Morel','Girard','André','Mercier','Dupont','Lambert','Bonnet','François','Martinez','Legrand','Garnier','Faure','Rousseau','Blanc','Guérin','Muller','Henry','Roussel','Perrin','Chevalier']
  },
  PT: {
    f:['João','Rodrigo','Martim','Tiago','Diogo','Gonçalo','Francisco','Duarte','Rafael','Pedro','Miguel','Bruno','Ricardo','André','Nuno','Rúben','Vítor','Fábio','Hugo','Luís','Gustavo','Tomás','Bernardo','Henrique','Simão','Vasco','Leandro','Sérgio'],
    l:['Silva','Santos','Ferreira','Pereira','Oliveira','Costa','Rodrigues','Martins','Jesus','Sousa','Fernandes','Gonçalves','Gomes','Lopes','Marques','Alves','Almeida','Ribeiro','Pinto','Carvalho','Teixeira','Moreira','Correia','Mendes','Nunes','Soares','Vieira','Monteiro','Cardoso','Rocha','Neves','Coelho','Cruz','Cunha','Pires','Ramos','Reis','Simões','Antunes','Matos']
  },
  NL: {
    f:['Daan','Sem','Lucas','Milan','Levi','Luuk','Thijs','Jesse','Bram','Stijn','Ruben','Tim','Lars','Niels','Koen','Joris','Sven','Jasper','Wout','Jens','Thomas','Kevin','Dries','Arne','Bart','Pieter','Jelle','Joep','Maarten','Sander'],
    l:['de Jong','Jansen','de Vries','van den Berg','van Dijk','Bakker','Janssen','Visser','Smit','Meijer','de Boer','Mulder','de Groot','Bos','Vos','Peters','Hendriks','van Leeuwen','Dekker','Brouwer','de Wit','Dijkstra','Smits','de Graaf','van der Meer','Kok','Jacobs','Willems','Peeters','Maes','Claes','Goossens','Wouters','De Smet','Vermeulen','Van Damme','Mertens','Dubois','Lambrechts','Verbeke']
  },
  TR: {
    f:['Mehmet','Mustafa','Ahmet','Ali','Hüseyin','Hasan','İbrahim','Emre','Burak','Murat','Cem','Can','Kerem','Arda','Yusuf','Ömer','Oğuz','Serkan','Tolga','Ozan','Barış','Kaan','Eren','Uğur','Halil','Furkan','Berkay','Doğukan','Enes','Onur'],
    l:['Yılmaz','Kaya','Demir','Şahin','Çelik','Yıldız','Yıldırım','Öztürk','Aydın','Özdemir','Arslan','Doğan','Kılıç','Aslan','Çetin','Kara','Koç','Kurt','Özkan','Şimşek','Polat','Erdoğan','Güneş','Akın','Aksoy','Bulut','Korkmaz','Tekin','Ünal','Güler','Karaca','Altun','Sarı','Kaplan','Aktaş','Bozkurt','Erdem','Turan']
  },
  NORD: {
    f:['Mikkel','Jonas','Magnus','Oliver','Emil','Lucas','William','Anders','Kasper','Rasmus','Sander','Henrik','Erik','Johan','Oskar','Viktor','Gustav','Elias','Filip','Isak','Aron','Gylfi','Jóhann','Eero','Teemu','Joni','Kristoffer','Fredrik','Mathias','Andreas'],
    l:['Hansen','Jensen','Nielsen','Pedersen','Andersen','Christensen','Larsen','Sørensen','Rasmussen','Johansen','Olsen','Berg','Haugen','Bakke','Solberg','Johansson','Andersson','Karlsson','Nilsson','Eriksson','Larsson','Olsson','Persson','Svensson','Gustafsson','Lindqvist','Lindberg','Sigurðsson','Guðmundsson','Jónsson','Korhonen','Virtanen','Mäkinen','Nieminen','Hämäläinen','Lehtonen','Dahl','Strand','Holm']
  },
  CZ: {
    f:['Jan','Jakub','Tomáš','Lukáš','Ondřej','Martin','Petr','David','Michal','Adam','Matěj','Vojtěch','Filip','Daniel','Patrik','Pavel','Marek','Václav','Jiří','Josef','Milan','Roman','Dominik','Šimon','Ľubomír','Juraj','Peter','Matúš'],
    l:['Novák','Svoboda','Novotný','Dvořák','Černý','Procházka','Kučera','Veselý','Horák','Němec','Pokorný','Marek','Pospíšil','Hájek','Jelínek','Král','Růžička','Beneš','Fiala','Sedláček','Doležal','Zeman','Kolář','Navrátil','Čermák','Vaněk','Urban','Blažek','Kříž','Kováč','Horváth','Varga','Tóth','Nagy','Baláž','Molnár','Šimko','Lukáč']
  },
  GR: {
    f:['Giorgos','Dimitris','Konstantinos','Nikos','Giannis','Christos','Panagiotis','Vasilis','Kostas','Thanasis','Michalis','Stelios','Sotiris','Andreas','Petros','Lazaros','Manolis','Alexandros','Spyros','Tasos','Fotis','Antonis','Charalampos','Pavlos','Ilias','Leonidas'],
    l:['Papadopoulos','Pappas','Oikonomou','Georgiou','Papadakis','Vasileiou','Nikolaidis','Karagiannis','Konstantinidis','Dimitriou','Ioannou','Christodoulou','Athanasiou','Makris','Antoniou','Papageorgiou','Kyriakou','Lambrou','Theodorou','Michailidis','Alexiou','Stavrou','Zografos','Karamanlis','Galanis','Tsiolis','Kalogeropoulos','Mavridis','Panagiotou','Siopis','Tzavellas','Vlachos','Xanthopoulos','Raptis','Samaras','Fountas']
  },
  UA: {
    f:['Ołeksandr','Andrij','Serhij','Wołodymyr','Mykoła','Dmytro','Witalij','Jurij','Bohdan','Taras','Maksym','Artem','Wiktor','Ihor','Roman','Denys','Wałerij','Rusłan','Ołeh','Mychajło','Pawło','Illa','Heorhij','Anatolij','Jewhen','Wadym'],
    l:['Melnyk','Szewczenko','Bojko','Kowalenko','Bondarenko','Tkaczenko','Kowalczuk','Kraweć','Ołijnyk','Szewczuk','Połiszczuk','Bondar','Tkaczuk','Marczenko','Łysenko','Rudenko','Sawczenko','Petrenko','Morozenko','Zinczenko','Hryhorenko','Wasylenko','Pawlenko','Kłymenko','Iwanenko','Mazur','Sydorenko','Karpenko','Ponomarenko','Kuczer','Hawryłenko','Fedorenko','Tymoszczuk','Charczenko','Matwijenko','Stepanenko','Szaparenko']
  },
  BALK: {
    f:['Luka','Marko','Nikola','Stefan','Filip','Ivan','Josip','Mateo','Dušan','Aleksandar','Miloš','Nemanja','Lazar','Vladimir','Strahinja','Ante','Mario','Dario','Domagoj','Edin','Amar','Kenan','Miralem','Jan','Žan','Benjamin','Bojan','Darko','Goran','Vedran','Nenad'],
    l:['Petrović','Jovanović','Nikolić','Marković','Đorđević','Stojanović','Ilić','Stanković','Pavlović','Milošević','Kovačević','Horvat','Kovačić','Babić','Marić','Jurić','Novak','Knežević','Vuković','Perić','Tomić','Popović','Matić','Božić','Radić','Hodžić','Begović','Hadžić','Mehmedović','Zupan','Krajnc','Kos','Vidović','Lukić','Mitrović','Stojković','Ristovski','Nikolovski','Vujović','Bošković']
  },
  HU: {
    f:['Bence','Máté','Levente','Dávid','Dominik','Ádám','Balázs','Gergő','Tamás','Péter','Zsolt','László','Attila','Norbert','Roland','Krisztián','Milán','Botond','Barnabás','Zoltán','Gábor','Dániel','Márton','András','Kristóf','Benedek'],
    l:['Nagy','Kovács','Tóth','Szabó','Horváth','Varga','Kiss','Molnár','Németh','Farkas','Balogh','Papp','Takács','Juhász','Lakatos','Mészáros','Oláh','Simon','Rácz','Fekete','Szilágyi','Török','Fehér','Balázs','Gál','Kis','Szűcs','Kocsis','Orsós','Pintér','Fodor','Szalai','Sipos','Magyar','Lukács','Gulyás','Bíró']
  },
  RO: {
    f:['Andrei','Alexandru','Ionuț','Mihai','Florin','Răzvan','Ștefan','Cristian','Bogdan','Adrian','Gabriel','Vlad','Darius','Nicolae','Valentin','Marius','Denis','Cosmin','Claudiu','Dragoș','Ciprian','Radu','Sorin','Tudor','Octavian','Constantin'],
    l:['Popescu','Ionescu','Popa','Pop','Dumitru','Stan','Stoica','Gheorghe','Matei','Ciobanu','Rusu','Munteanu','Constantin','Moldovan','Mihai','Dinu','Ene','Tănase','Lazăr','Marin','Toma','Florea','Sârbu','Neagu','Bălan','Radu','Nistor','Dobre','Chiriac','Cristea','Barbu','Manea','Mocanu','Ursu','Vasilescu','Oprea','Diaconu']
  },
  BG: {
    f:['Georgi','Ivan','Dimitar','Nikolay','Hristo','Petar','Stoyan','Todor','Aleksandar','Kiril','Martin','Valentin','Iliya','Atanas','Kaloyan','Plamen','Radoslav','Svetoslav','Yordan','Borislav','Stanislav','Vasil','Momchil','Bozhidar','Lyubomir','Emil'],
    l:['Ivanov','Georgiev','Dimitrov','Petrov','Nikolov','Hristov','Stoyanov','Todorov','Iliev','Angelov','Atanasov','Vasilev','Kolev','Marinov','Popov','Petkov','Yordanov','Mihaylov','Kostov','Stefanov','Tsvetkov','Genchev','Bozhinov','Krastev','Slavchev','Raykov','Penev','Valchev','Kirilov','Mladenov','Zhelev','Chochev','Dyakov','Kovachev','Yankov','Aleksandrov','Pavlov']
  },
  AL: {
    f:['Ardit','Arben','Besnik','Bujar','Driton','Elseid','Ermir','Fatos','Genti','Gjergj','Klaus','Kristjan','Ledian','Lorik','Marash','Mergim','Myrto','Nedim','Odise','Qazim','Rey','Sokol','Taulant','Valon','Xhevdet','Ylber','Endrit'],
    l:['Hoxha','Shehu','Leka','Kola','Gashi','Krasniqi','Berisha','Dervishi','Hysaj','Kastrati','Bajrami','Dushku','Çani','Mavraj','Ismajli','Ajeti','Abrashi','Ramadani','Selmani','Muçi','Gjasula','Lenjani','Daku','Broja','Bare','Laçi','Manaj','Asllani','Pashaj','Kumbulla','Uzuni','Seferi','Mihaj','Hoti','Zeqiri','Dibra','Tafa']
  },
  GE: {
    f:['Giorgi','Levan','Luka','Davit','Nika','Otar','Zurab','Saba','Lasha','Irakli','Guram','Tornike','Gela','Revaz','Vako','Budu','Jaba','Anzor','Beka','Mikheil','Shota','Tamaz','Valeri','Gocha','Kakha','Nodar'],
    l:['Beridze','Kapanadze','Gelashvili','Maisuradze','Giorgadze','Lomidze','Tsiklauri','Bolkvadze','Nozadze','Khutsishvili','Kvaratskhelia','Mamardashvili','Chakvetadze','Kochorashvili','Zivzivadze','Lobjanidze','Kvekveskiri','Davitashvili','Mikautadze','Kashia','Kakabadze','Shengelia','Tsitaishvili','Gugeshashvili','Azarovi','Abuladze','Japaridze','Kiteishvili','Lochoshvili','Mekvabishvili','Okriashvili','Qaladze','Gvilia','Jikia','Chabradze','Zhvania','Tabatadze']
  },
  IL: {
    f:['Eran','Omer','Yonatan','Itay','Dor','Liel','Oscar','Manor','Gavriel','Shon','Roy','Idan','Tomer','Eli','Yoav','Ofir','Bibras','Sagiv','Mohammad','Dean','Ido','Raz','Nir','Amit','Guy','Stav'],
    l:['Cohen','Levi','Mizrahi','Peretz','Biton','Dahan','Avraham','Friedman','Azulay','Malka','Katz','Yosef','Ohana','Gabay','Elbaz','Hadad','Shapira','Ben Haim','Zahavi','Abu Fani','Gloukh','Solomon','Weissman','Dasa','Lemkin','Revivo','Haziza','Turgeman','Natcho','Kanichowsky','Baribo','Nachmias','Golasa','Jaber','Goldberg','Shmuel','Amar']
  },
  BR: {
    f:['Gabriel','Lucas','Matheus','Pedro','Guilherme','Gustavo','Rafael','Felipe','Bruno','João','Thiago','Vinícius','Diego','Caio','Rodrigo','Leonardo','Eduardo','André','Marcos','Douglas','Wesley','Igor','Renan','Danilo','Fabrício','Murilo','Júnior','Éverton','Raphael','Alisson'],
    l:['Silva','Santos','Oliveira','Souza','Rodrigues','Ferreira','Alves','Pereira','Lima','Gomes','Costa','Ribeiro','Martins','Carvalho','Almeida','Lopes','Soares','Fernandes','Vieira','Barbosa','Rocha','Dias','Nascimento','Andrade','Moreira','Nunes','Marques','Machado','Mendes','Freitas','Cardoso','Ramos','Gonçalves','Santana','Teixeira','Araújo','Moura','Cavalcanti','Correia']
  },
  LATAM: {
    f:['Juan','Santiago','Matías','Nicolás','Sebastián','Facundo','Agustín','Lautaro','Emiliano','Federico','Gonzalo','Joaquín','Franco','Rodrigo','Maximiliano','Luis','José','Carlos','Jorge','Andrés','Camilo','Jhon','Brayan','Kevin','Moisés','Édgar','Hirving','Raúl','Cristian','Diego','Ezequiel'],
    l:['González','Rodríguez','Gómez','Fernández','López','Díaz','Martínez','Pérez','García','Sánchez','Romero','Sosa','Torres','Álvarez','Ruiz','Ramírez','Flores','Acosta','Benítez','Medina','Herrera','Aguirre','Giménez','Molina','Silva','Castro','Rojas','Ortiz','Cabrera','Vargas','Morales','Suárez','Quintero','Arias','Cuesta','Caicedo','Estupiñán','Hernández','Jiménez','Montes','Valencia','Méndez','Pereyra','Paredes']
  },
  JP: {
    f:['Takumi','Kaoru','Wataru','Daichi','Ritsu','Takefusa','Junya','Ko','Hiroki','Yuto','Kento','Shogo','Ayase','Reo','Daizen','Keito','Yuki','Kaishu','Hidemasa','Ao','Takehiro','Zion','Koki','Shuto','Sota','Ryota','Haruto','Kazuki'],
    l:['Sato','Suzuki','Takahashi','Tanaka','Watanabe','Ito','Yamamoto','Nakamura','Kobayashi','Kato','Yoshida','Yamada','Sasaki','Yamaguchi','Matsumoto','Inoue','Kimura','Hayashi','Shimizu','Yamazaki','Mori','Abe','Ikeda','Hashimoto','Ishikawa','Ogawa','Okada','Maeda','Fujita','Endo','Morita','Ueda','Itakura','Machida','Hatate','Kubo','Minamino','Doan','Tomiyasu']
  },
  KR: {
    f:['Min-jae','Heung-min','Kang-in','Hee-chan','Jae-sung','Gue-sung','Seung-ho','In-beom','Woo-young','Young-woo','Ji-sung','Tae-hwan','Hyun-woo','Jun-ho','Dong-hyun','Sang-ho','Seol-young','Jin-su','Chang-hoon','Ui-jo','Jin-gyu','Seung-gyu','Kyung-won','Moon-hwan','Ki-hyuk','Do-hyeon'],
    l:['Kim','Lee','Park','Choi','Jung','Kang','Cho','Yoon','Jang','Lim','Han','Oh','Seo','Shin','Kwon','Hwang','Ahn','Song','Jeon','Hong','Yoo','Ko','Moon','Yang','Son','Bae','Baek','Heo','Nam','Noh','Ha','Kwak','Sung','Cha','Joo','Woo','Min']
  },
  ARAB: {
    f:['Mohamed','Ahmed','Youssef','Omar','Karim','Hakim','Achraf','Sofiane','Riyad','Ismaël','Amine','Bilal','Ayoub','Hamza','Mahmoud','Mostafa','Ibrahim','Rami','Nabil','Adel','Walid','Zakaria','Azzedine','Abdelhamid','Brahim','Ilias','Said','Tarek'],
    l:['Benali','Haddad','Mansouri','El Amrani','Bennani','Belkacem','Bouzid','Hamdi','Saidi','Rahmani','El Idrissi','Ziani','Bounou','Hakimi','Amrabat','Aguerd','En-Nesyri','Saïss','Ounahi','Brahimi','Mahrez','Bennacer','Slimani','Aouar','Bentaleb','Mandi','Feghouli','Salah','Trezeguet','Elneny','Hegazi','Abdelmonem','Hamdy','Fathy','Ashour','Zizo','Marmoush','Mostafa','Gaber']
  },
  FRAF: {
    f:['Moussa','Ismaïla','Cheikhou','Idrissa','Pape','Abdou','Mamadou','Ibrahima','Serge','Franck','Wilfried','Simon','Seko','Ousmane','Habib','Krépin','Boulaye','Nicolas','André','Vincent','Eric','Bryan','Karl','Georges','Christian','Jean-Paul','Didier','Lassine'],
    l:['Diallo','Ndiaye','Diop','Sow','Fall','Sarr','Gueye','Mendy','Cissé','Koné','Traoré','Touré','Kouassi','Bamba','Coulibaly','Kessié','Fofana','Zaha','Aurier','Diomandé','Konaté','Camara','Seck','Faye','Ndoye','Mbaye','Thiam','Diatta','Onana','Aboubakar','Choupo','Toko','Ekambi','Mbeumo','Anguissa','Nkoulou','Ngadeu','Bassogog','Moukoudi','Kunde']
  },
  WAF: {
    f:['Victor','Samuel','Ademola','Alex','Wilfred','Kelechi','Ahmed','Calvin','Moses','Frank','Joe','Taiwo','Chidozie','Kenneth','Emmanuel','Daniel','Thomas','Jordan','André','Mohammed','Kwame','Kofi','Inaki','Antoine','Abdul','Joseph','Osman','Tariq'],
    l:['Osimhen','Chukwueze','Lookman','Iwobi','Ndidi','Iheanacho','Aribo','Simon','Troost-Ekong','Bassey','Onyeka','Okoye','Nwankwo','Okafor','Eze','Adeyemi','Balogun','Uzoho','Onuachu','Ajayi','Mensah','Asamoah','Boateng','Owusu','Partey','Kudus','Ayew','Amartey','Salisu','Djiku','Fatawu','Semenyo','Lamptey','Agyemang','Appiah','Quaye','Frimpong','Danso']
  }
};

if (typeof module !== 'undefined') module.exports = { COUNTRY_DATA, NATIONS, NAME_POOLS };
