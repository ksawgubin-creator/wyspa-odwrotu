// Dane gry: kraje, ligi, kluby, reprezentacje i pule nazwisk.
// Krotka klubu: [nazwa, skrót, kolor główny, kolor drugi, reputacja 1-100, pojemność stadionu]

const COUNTRIES = [
  { code:'ENG', name:'Anglia', flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', nat:'ENG', coef:[21.428, 23.000, 17.375, 29.464, 25.000],
    leagues:[
      { id:'ENG1', name:'Premier League', tier:1, clubs:[
        ['Manchester City','MCI','#6CABDD','#1C2C5B',95,53400],
        ['Liverpool','LIV','#C8102E','#FFFFFF',93,61276],
        ['Arsenal','ARS','#EF0107','#FFFFFF',92,60704],
        ['Chelsea','CHE','#034694','#FFFFFF',88,40343],
        ['Manchester United','MUN','#DA291C','#FBE122',86,74310],
        ['Tottenham Hotspur','TOT','#132257','#FFFFFF',83,62850],
        ['Newcastle United','NEW','#241F20','#FFFFFF',82,52305],
        ['Aston Villa','AVL','#670E36','#95BFE5',80,42640],
        ['Brighton & Hove Albion','BHA','#0057B8','#FFFFFF',77,31876],
        ['Nottingham Forest','NFO','#DD0000','#FFFFFF',76,30404],
        ['West Ham United','WHU','#7A263A','#F3D459',75,62500],
        ['Crystal Palace','CRY','#1B458F','#FFFFFF',76,25486],
        ['Bournemouth','BOU','#DA291C','#000000',74,11307],
        ['Fulham','FUL','#FFFFFF','#000000',73,29589],
        ['Brentford','BRE','#E30613','#FFFFFF',73,17250],
        ['Everton','EVE','#003399','#FFFFFF',74,52888],
        ['Wolverhampton Wanderers','WOL','#FDB913','#231F20',72,31750],
        ['Leeds United','LEE','#FFFFFF','#1D428A',69,37645],
        ['Burnley','BUR','#6C1D45','#99D6EA',67,21944],
        ['Sunderland','SUN','#EB172B','#FFFFFF',68,48707]
      ]},
      { id:'ENG2', name:'Championship', tier:2, clubs:[
        ['Southampton','SOU','#D71920','#FFFFFF',66,32384],
        ['Leicester City','LEI','#003090','#FDBE11',66,32262],
        ['Ipswich Town','IPS','#3A64A3','#FFFFFF',64,29673],
        ['Sheffield United','SHU','#EE2737','#FFFFFF',62,32050],
        ['Middlesbrough','MID','#E11B22','#FFFFFF',61,34742],
        ['Coventry City','COV','#59CBE8','#1A2B4C',61,32609],
        ['West Bromwich Albion','WBA','#122F67','#FFFFFF',60,26850],
        ['Norwich City','NOR','#00A650','#FFF200',60,27359],
        ['Watford','WAT','#FBEE23','#ED2127',59,22200],
        ['Stoke City','STK','#E03A3E','#FFFFFF',58,30089],
        ['Hull City','HUL','#F5A12D','#000000',57,25586],
        ['Swansea City','SWA','#FFFFFF','#121212',57,21088],
        ['Bristol City','BRC','#E21A23','#FFFFFF',57,27000],
        ['Millwall','MIL','#001D5E','#FFFFFF',56,20146],
        ['Preston North End','PNE','#FFFFFF','#00205B',55,23404],
        ['Queens Park Rangers','QPR','#1D5BA4','#FFFFFF',55,18439],
        ['Blackburn Rovers','BLB','#009EE0','#FFFFFF',55,31367],
        ['Derby County','DER','#FFFFFF','#000000',56,32956],
        ['Sheffield Wednesday','SHW','#0E00F7','#FFFFFF',53,39732],
        ['Portsmouth','POR','#001489','#FFFFFF',54,20867],
        ['Birmingham City','BIR','#0000FF','#FFFFFF',58,29409],
        ['Wrexham','WRX','#D2001C','#FFFFFF',55,12600],
        ['Charlton Athletic','CHA','#D4021D','#FFFFFF',51,27111],
        ['Oxford United','OXF','#FFF200','#0B1F65',50,12500]
      ]}
    ]},
  { code:'ESP', name:'Hiszpania', flag:'🇪🇸', nat:'ESP', coef:[18.428, 16.571, 16.062, 19.000, 18.500],
    leagues:[
      { id:'ESP1', name:'LaLiga', tier:1, clubs:[
        ['Real Madrid','RMA','#FFFFFF','#00529F',96,83186],
        ['FC Barcelona','BAR','#A50044','#EDBB00',92,99354],
        ['Atlético Madrid','ATM','#CB3524','#FFFFFF',87,70460],
        ['Athletic Club','ATH','#EE2523','#FFFFFF',78,53289],
        ['Villarreal','VIL','#FFE667','#005187',77,23500],
        ['Real Sociedad','RSO','#0067B1','#FFFFFF',76,39500],
        ['Real Betis','BET','#0BB363','#FFFFFF',76,60721],
        ['Sevilla','SEV','#FFFFFF','#D4021D',75,43883],
        ['Valencia','VAL','#FFFFFF','#000000',73,49430],
        ['Girona','GIR','#CD2534','#FFFFFF',71,14624],
        ['Celta Vigo','CEL','#8AC3EE','#002B5C',71,24870],
        ['Osasuna','OSA','#D91A21','#0A346F',70,23576],
        ['Rayo Vallecano','RAY','#FFFFFF','#E53027',69,14708],
        ['Mallorca','MLL','#E20613','#000000',69,26020],
        ['Getafe','GET','#005999','#FFFFFF',68,16500],
        ['Espanyol','ESY','#007FC8','#FFFFFF',68,40000],
        ['Deportivo Alavés','ALA','#0761AF','#FFFFFF',67,19840],
        ['Elche','ELC','#FFFFFF','#05642C',65,31388],
        ['Levante','LEV','#B4053F','#004D98',65,26354],
        ['Real Oviedo','OVI','#0047AB','#FFFFFF',64,30500]
      ]},
      { id:'ESP2', name:'LaLiga 2', tier:2, clubs:[
        ['Las Palmas','LPA','#FFE400','#0055A4',62,32400],
        ['Real Valladolid','VLL','#921B88','#FFFFFF',61,27618],
        ['Leganés','LEG','#0044A9','#FFFFFF',60,12454],
        ['Granada','GRA','#C8102E','#FFFFFF',59,19336],
        ['Cádiz','CAD','#FDE607','#0045A7',59,20724],
        ['Almería','ALM','#EE1119','#FFFFFF',59,15274],
        ['Málaga','MAL','#0055A4','#FFFFFF',58,30044],
        ['Deportivo La Coruña','DEP','#004D98','#FFFFFF',58,32490],
        ['Real Zaragoza','ZAR','#FFFFFF','#003DA5',57,33608],
        ['Sporting Gijón','SPG','#E30613','#FFFFFF',57,29371],
        ['Racing Santander','RAC','#FFFFFF','#00813D',56,22222],
        ['Eibar','EIB','#003C71','#A6192E',55,8164],
        ['SD Huesca','HUE','#003E7E','#C8102E',53,9100],
        ['Albacete','ALB','#FFFFFF','#B2141F',52,17524],
        ['Burgos','BRG','#FFFFFF','#000000',51,12194],
        ['Mirandés','MIR','#E6007E','#000000',51,5759],
        ['Córdoba','COR','#FFFFFF','#00843D',52,21822],
        ['Castellón','CAS','#000000','#FFFFFF',51,15500],
        ['Cultural Leonesa','CUL','#FFFFFF','#8B0000',48,13451],
        ['FC Andorra','AND','#002F6C','#FFD100',49,5000],
        ['AD Ceuta','CEU','#FFFFFF','#000000',46,6500],
        ['Real Sociedad B','RSB','#0067B1','#FFFFFF',45,2500]
      ]}
    ]},
  { code:'ITA', name:'Włochy', flag:'🇮🇹', nat:'ITA', coef:[15.714, 22.357, 21.000, 21.875, 18.000],
    leagues:[
      { id:'ITA1', name:'Serie A', tier:1, clubs:[
        ['Inter','INT','#0068A8','#000000',89,75817],
        ['Napoli','NAP','#12A0D7','#FFFFFF',86,54726],
        ['Juventus','JUV','#000000','#FFFFFF',86,41507],
        ['AC Milan','ACM','#FB090B','#000000',85,75817],
        ['Atalanta','ATA','#1E71B8','#000000',82,24950],
        ['AS Roma','ROM','#8E1F2F','#F0BC42',80,70634],
        ['Lazio','LAZ','#87D8F7','#15366F',77,70634],
        ['Fiorentina','FIO','#482E92','#FFFFFF',75,43147],
        ['Bologna','BOL','#1A2F48','#A21C26',76,36462],
        ['Como','COM','#00285E','#FFFFFF',72,13602],
        ['Torino','TOR','#8B1E3F','#FFFFFF',71,27958],
        ['Udinese','UDI','#FFFFFF','#000000',68,25144],
        ['Genoa','GEN','#A31F34','#0A2140',68,36599],
        ['Cagliari','CAG','#A50C2E','#002350',66,16416],
        ['Parma','PAR','#FFDD00','#1C3E7A',66,22352],
        ['Sassuolo','SAS','#00A752','#000000',66,21584],
        ['Hellas Verona','VER','#003B7A','#FFD200',65,39211],
        ['Lecce','LEC','#FFD100','#D50032',65,31533],
        ['Cremonese','CRE','#C8102E','#9EA2A2',63,16003],
        ['Pisa','PIS','#000000','#4B9CD3',63,10500]
      ]},
      { id:'ITA2', name:'Serie B', tier:2, clubs:[
        ['Monza','MON','#E30613','#FFFFFF',60,16917],
        ['Venezia','VEN','#F06A22','#000000',59,11150],
        ['Empoli','EMP','#00579C','#FFFFFF',59,16284],
        ['Sampdoria','SAM','#1A4D9E','#FFFFFF',58,36599],
        ['Palermo','PAL','#F5B6CD','#000000',58,36365],
        ['Spezia','SPE','#FFFFFF','#000000',55,10336],
        ['Frosinone','FRO','#FFE600','#0058A3',54,16227],
        ['Bari','BRI','#E10019','#FFFFFF',54,58270],
        ['Modena','MOD','#FFDD00','#003399',52,21151],
        ['Catanzaro','CTZ','#FFCC00','#C8102E',51,14650],
        ['Cesena','CES','#000000','#FFFFFF',51,23860],
        ['Südtirol','SUD','#C8102E','#FFFFFF',50,5539],
        ['Reggiana','REG','#8B1A2F','#FFFFFF',50,20084],
        ['Padova','PAD','#FFFFFF','#C8102E',50,18060],
        ['Mantova','MNT','#C8102E','#FFFFFF',49,14884],
        ['Juve Stabia','JST','#FFDD00','#1D3A8A',48,12800],
        ['Carrarese','CRR','#FFDD00','#0047AB',47,4000],
        ['Pescara','PES','#4AB0E8','#FFFFFF',48,20476],
        ['Avellino','AVE','#00843D','#FFFFFF',47,26308],
        ['Virtus Entella','ENT','#1E90FF','#FFFFFF',46,5535]
      ]}
    ]},
  { code:'GER', name:'Niemcy', flag:'🇩🇪', nat:'GER', coef:[16.214, 17.125, 19.357, 18.000, 18.000],
    leagues:[
      { id:'GER1', name:'Bundesliga', tier:1, clubs:[
        ['Bayern Monachium','FCB','#DC052D','#FFFFFF',94,75024],
        ['Borussia Dortmund','BVB','#FDE100','#000000',87,81365],
        ['Bayer Leverkusen','BLE','#E32221','#000000',85,30210],
        ['RB Lipsk','RBL','#FFFFFF','#DD0741',81,47069],
        ['Eintracht Frankfurt','SGE','#E1000F','#000000',78,58000],
        ['VfB Stuttgart','VFB','#FFFFFF','#E32219',77,60449],
        ['SC Freiburg','SCF','#000000','#E2001A',73,34700],
        ['VfL Wolfsburg','WOB','#65B32E','#FFFFFF',72,28917],
        ['Borussia Mönchengladbach','BMG','#FFFFFF','#00A651',72,54042],
        ['1. FSV Mainz 05','MAI','#C3141E','#FFFFFF',71,33305],
        ['TSG Hoffenheim','TSG','#1C63B7','#FFFFFF',71,30150],
        ['Werder Brema','SVW','#1D9053','#FFFFFF',71,42100],
        ['1. FC Union Berlin','FCU','#EB1923','#FFFFFF',70,22012],
        ['FC Augsburg','FCA','#BA3733','#FFFFFF',68,30660],
        ['1. FC Köln','KOE','#ED1C24','#FFFFFF',68,50000],
        ['Hamburger SV','HSV','#0A3F86','#FFFFFF',68,57000],
        ['FC St. Pauli','STP','#5A3828','#FFFFFF',66,29546],
        ['1. FC Heidenheim','FCH','#E2001A','#003B79',65,15000]
      ]},
      { id:'GER2', name:'2. Bundesliga', tier:2, clubs:[
        ['FC Schalke 04','SCH','#004D9D','#FFFFFF',62,62271],
        ['VfL Bochum','BOC','#005CA9','#FFFFFF',60,26000],
        ['Holstein Kiel','KSV','#0B4797','#FFFFFF',58,15034],
        ['Hertha BSC','BSC','#005CA9','#FFFFFF',59,74475],
        ['Fortuna Düsseldorf','FOR','#DA251D','#FFFFFF',57,54600],
        ['Hannover 96','HAN','#00843D','#000000',57,49000],
        ['1. FC Kaiserslautern','FCK','#C8102E','#FFFFFF',56,49327],
        ['1. FC Nürnberg','FCN','#9E1B32','#FFFFFF',56,50000],
        ['SV Darmstadt 98','DAR','#004E9E','#FFFFFF',55,17810],
        ['Karlsruher SC','KSC','#0050A0','#FFFFFF',54,34302],
        ['SC Paderborn 07','SCP','#004F9F','#000000',54,15000],
        ['SV Elversberg','SVE','#000000','#FFFFFF',52,10000],
        ['1. FC Magdeburg','FCM','#0069B4','#FFFFFF',53,30098],
        ['Greuther Fürth','SGF','#00A650','#FFFFFF',52,16626],
        ['Eintracht Braunschweig','EBS','#FFE500','#003B7B',51,23325],
        ['Arminia Bielefeld','DSC','#004E95','#FFFFFF',53,26515],
        ['Dynamo Drezno','SGD','#FFD700','#000000',52,32066],
        ['Preußen Münster','SCM','#006B3F','#000000',49,14300]
      ]}
    ]},
  { code:'FRA', name:'Francja', flag:'🇫🇷', nat:'FRA', coef:[18.416, 12.916, 13.500, 17.125, 16.000],
    leagues:[
      { id:'FRA1', name:'Ligue 1', tier:1, clubs:[
        ['Paris Saint-Germain','PSG','#004170','#DA291C',93,47929],
        ['Olympique Marsylia','OMA','#2FAEE0','#FFFFFF',80,67394],
        ['AS Monaco','ASM','#E2001A','#FFFFFF',79,18523],
        ['LOSC Lille','LIL','#E01E13','#20325F',77,50186],
        ['Olympique Lyon','LYO','#FFFFFF','#14387F',77,59186],
        ['OGC Nice','NIC','#C8102E','#000000',74,36178],
        ['RC Lens','RCL','#FFD200','#E30613',74,38223],
        ['RC Strasbourg','RCS','#0079C2','#FFFFFF',72,26109],
        ['Stade Rennais','REN','#E13327','#000000',72,29778],
        ['Stade Brestois','BRS','#E30613','#FFFFFF',69,15220],
        ['Toulouse FC','TFC','#5E2C82','#FFFFFF',68,33150],
        ['FC Nantes','NAN','#FCD405','#00805F',67,35322],
        ['AJ Auxerre','AJA','#FFFFFF','#00428C',65,18541],
        ['Angers SCO','SCO','#000000','#FFFFFF',64,18752],
        ['Le Havre AC','HAC','#4A8DCA','#002B5C',63,25178],
        ['FC Lorient','FCL','#F58113','#000000',63,18890],
        ['Paris FC','PFC','#1B2A4E','#FFFFFF',64,20000],
        ['FC Metz','MET','#7A0F2D','#FFFFFF',63,30000]
      ]},
      { id:'FRA2', name:'Ligue 2', tier:2, clubs:[
        ['AS Saint-Étienne','STE','#00843D','#FFFFFF',61,41965],
        ['Montpellier HSC','MTP','#00214E','#F68C1F',59,32900],
        ['Stade de Reims','SDR','#E30613','#FFFFFF',60,21684],
        ['Clermont Foot','CLE','#7D0A1A','#00205B',53,11980],
        ['ESTAC Troyes','EST','#005DAA','#FFFFFF',53,20400],
        ['EA Guingamp','EAG','#E2001A','#000000',52,18378],
        ['FC Annecy','ANN','#C8102E','#FFFFFF',50,15660],
        ['Stade Lavallois','LAV','#F37021','#000000',50,18467],
        ['SC Bastia','SCB','#0055A4','#FFFFFF',51,16480],
        ['Pau FC','PAU','#FFD200','#003B79',48,4000],
        ['Red Star FC','RSF','#00843D','#FFFFFF',49,6000],
        ['Amiens SC','ASC','#000000','#FFFFFF',51,12097],
        ['Rodez AF','RAF','#C8102E','#FFD200',48,5955],
        ['Grenoble Foot 38','GRE','#004B93','#FFFFFF',49,20068],
        ['USL Dunkerque','USL','#005EB8','#FFFFFF',48,4933],
        ['Le Mans FC','LMF','#C8102E','#FFD200',48,25064],
        ['AS Nancy Lorraine','NCY','#E2001A','#FFFFFF',49,20087],
        ['US Boulogne','BLO','#C8102E','#000000',46,14500]
      ]}
    ]},
  { code:'POL', name:'Polska', flag:'🇵🇱', nat:'POL', coef:[4.625, 7.500, 4.000, 13.875, 10.000],
    leagues:[
      { id:'POL1', name:'Ekstraklasa', tier:1, clubs:[
        ['Legia Warszawa','LEW','#00843D','#FFFFFF',62,31103],
        ['Lech Poznań','LPO','#005BAC','#FFFFFF',61,42837],
        ['Raków Częstochowa','RKC','#C8102E','#004B93',60,5500],
        ['Jagiellonia Białystok','JAG','#FFD100','#C8102E',59,22372],
        ['Pogoń Szczecin','POG','#002E6D','#9B1B30',56,21163],
        ['Górnik Zabrze','GZA','#002F87','#FFFFFF',54,24563],
        ['Cracovia','CRA','#FFFFFF','#C8102E',53,15016],
        ['Widzew Łódź','WID','#C8102E','#FFFFFF',54,18018],
        ['Zagłębie Lubin','ZAG','#FF6600','#00643C',51,16068],
        ['Piast Gliwice','PIA','#003C82','#C8102E',51,9913],
        ['Lechia Gdańsk','LGD','#00843D','#FFFFFF',50,41620],
        ['Korona Kielce','KOR','#FFD100','#C8102E',49,15550],
        ['Radomiak Radom','RAD','#00843D','#FFFFFF',48,8840],
        ['Motor Lublin','MOT','#FFD100','#0047AB',48,15247],
        ['GKS Katowice','GKS','#FFD100','#00843D',48,15048],
        ['Wisła Płock','WPL','#003D7D','#FFFFFF',47,15004],
        ['Arka Gdynia','ARK','#FFD100','#0057A8',46,15139],
        ['Bruk-Bet Termalica Nieciecza','TNI','#F58220','#000000',45,4666]
      ]},
      { id:'POL2', name:'I liga', tier:2, clubs:[
        ['Śląsk Wrocław','SLA','#00843D','#FFFFFF',44,42771],
        ['Wisła Kraków','WKR','#FFFFFF','#C8102E',44,33130],
        ['Stal Mielec','STM','#0047AB','#FFFFFF',41,6864],
        ['Puszcza Niepołomice','PUS','#00843D','#FFD100',39,2118],
        ['Ruch Chorzów','RCH','#0047AB','#FFFFFF',41,9300],
        ['ŁKS Łódź','LKS','#FFFFFF','#C8102E',41,18008],
        ['Polonia Warszawa','PWA','#000000','#FFFFFF',38,7150],
        ['Miedź Legnica','MIE','#00843D','#C8102E',39,6244],
        ['Odra Opole','ODR','#0047AB','#C8102E',37,11600],
        ['Górnik Łęczna','GLE','#00843D','#000000',36,7464],
        ['GKS Tychy','GTY','#00843D','#C8102E',37,15300],
        ['Stal Rzeszów','SRZ','#0047AB','#FFFFFF',36,11547],
        ['Chrobry Głogów','CHG','#FF6600','#000000',35,2817],
        ['Znicz Pruszków','ZNI','#C8102E','#000000',33,1977],
        ['Wieczysta Kraków','WIE','#FFD100','#000000',38,1500],
        ['Polonia Bytom','PBY','#C8102E','#003399',35,5000],
        ['Pogoń Grodzisk Mazowiecki','PGM','#0047AB','#C8102E',32,2000],
        ['Pogoń Siedlce','PSI','#00843D','#000000',32,2900]
      ]}
    ]},
  { code:'POR', name:'Portugalia', flag:'🇵🇹', nat:'POR', coef:[10.500, 12.000, 10.833, 13.050, 12.500],
    leagues:[
      { id:'POR1', name:'Liga Portugal', tier:1, clubs:[
        ['Benfica','SLB','#E83030','#FFFFFF',82,64642],
        ['FC Porto','FCP','#003893','#FFFFFF',81,50033],
        ['Sporting CP','SPO','#008057','#FFFFFF',81,50095],
        ['SC Braga','SBR','#DC0714','#FFFFFF',73,30286],
        ['Vitória Guimarães','VSC','#FFFFFF','#000000',66,30029],
        ['Santa Clara','SCL','#C8102E','#FFFFFF',60,12500],
        ['Famalicão','FAM','#003A80','#FFFFFF',60,5307],
        ['Estoril Praia','EPR','#FFDD00','#0050A0',58,8015],
        ['Casa Pia','CPA','#000000','#FFFFFF',56,9000],
        ['Moreirense','MOR','#00843D','#FFFFFF',56,6153],
        ['Rio Ave','RAV','#00843D','#FFFFFF',56,12815],
        ['Gil Vicente','GIL','#C8102E','#FFFFFF',57,12046],
        ['FC Arouca','ARO','#FFD100','#0047AB',55,5600],
        ['CD Nacional','NAC','#000000','#FFFFFF',53,5132],
        ['Estrela da Amadora','EAM','#C8102E','#00843D',52,9288],
        ['AVS Futebol SAD','AVS','#C8102E','#FFFFFF',50,5000],
        ['CD Tondela','TON','#FFD100','#00843D',51,5000],
        ['FC Alverca','ALV','#C8102E','#FFFFFF',50,7705]
      ]}
    ]},
  { code:'NED', name:'Holandia', flag:'🇳🇱', nat:'NED', coef:[19.200, 11.000, 13.000, 15.250, 12.000],
    leagues:[
      { id:'NED1', name:'Eredivisie', tier:1, clubs:[
        ['PSV Eindhoven','PSV','#ED1C24','#FFFFFF',80,35000],
        ['Ajax','AJX','#D2122E','#FFFFFF',80,55865],
        ['Feyenoord','FEY','#E30613','#FFFFFF',79,47500],
        ['AZ Alkmaar','AZA','#DB0021','#FFFFFF',72,19478],
        ['FC Twente','TWE','#E30613','#FFFFFF',68,30205],
        ['FC Utrecht','UTR','#E30613','#FFFFFF',67,23750],
        ['Go Ahead Eagles','GAE','#E30613','#FFD200',61,10400],
        ['NEC Nijmegen','NEC','#C8102E','#00843D',61,12500],
        ['SC Heerenveen','HEE','#0047AB','#FFFFFF',60,27224],
        ['PEC Zwolle','PEC','#0047AB','#FFFFFF',56,14000],
        ['Fortuna Sittard','FSI','#FFD100','#00843D',56,12500],
        ['Sparta Rotterdam','SPR','#E30613','#FFFFFF',57,11026],
        ['FC Groningen','GRO','#00843D','#FFFFFF',58,22550],
        ['Heracles Almelo','HER','#000000','#FFFFFF',55,12080],
        ['NAC Breda','NAB','#FFD100','#000000',56,19000],
        ['Excelsior','EXC','#E30613','#000000',52,4500],
        ['Telstar','TEL','#FFFFFF','#003399',50,5000],
        ['FC Volendam','VOL','#FF6600','#000000',51,6260]
      ]}
    ]},
  { code:'BEL', name:'Belgia', flag:'🇧🇪', nat:'BEL', coef:[10.000, 13.400, 12.600, 13.000, 11.500],
    leagues:[
      { id:'BEL1', name:'Jupiler Pro League', tier:1, clubs:[
        ['Club Brugge','CLB','#0067CE','#000000',74,29062],
        ['Royale Union Saint-Gilloise','USG','#FFD100','#0047AB',70,9400],
        ['RSC Anderlecht','RSC','#5C2483','#FFFFFF',70,22500],
        ['KRC Genk','KRC','#0047AB','#FFFFFF',68,23718],
        ['KAA Gent','KAA','#003A80','#FFFFFF',67,20000],
        ['Royal Antwerp','ANT','#E30613','#FFFFFF',66,16144],
        ['Standard Liège','STA','#E30613','#FFFFFF',64,27670],
        ['KV Mechelen','KVM','#FFD100','#E30613',59,16700],
        ['Sporting Charleroi','SPC','#000000','#FFFFFF',59,15000],
        ['KVC Westerlo','WES','#FFD100','#0047AB',57,8035],
        ['OH Leuven','OHL','#FFFFFF','#00843D',56,10020],
        ['Sint-Truiden','STV','#FFD100','#0047AB',55,14600],
        ['Cercle Brugge','CER','#00843D','#000000',55,29062],
        ['FCV Dender','DEN','#000000','#FFFFFF',52,6429],
        ['RAAL La Louvière','RLL','#00843D','#FFFFFF',50,8050],
        ['SV Zulte Waregem','ZWA','#E30613','#00843D',53,12500]
      ]}
    ]},
  { code:'TUR', name:'Turcja', flag:'🇹🇷', nat:'TUR', coef:[6.400, 10.000, 12.000, 10.800, 10.500],
    leagues:[
      { id:'TUR1', name:'Süper Lig', tier:1, clubs:[
        ['Galatasaray','GAL','#A90432','#FDB912',78,52280],
        ['Fenerbahçe','FEN','#163962','#FFED00',77,47834],
        ['Beşiktaş','BJK','#000000','#FFFFFF',73,42590],
        ['Trabzonspor','TRA','#8B1E3F','#4FC3F7',67,40782],
        ['İstanbul Başakşehir','IBB','#E94E0F','#1B2B5A',64,17319],
        ['Samsunspor','SMS','#E30613','#FFFFFF',61,33919],
        ['Göztepe','GOZ','#FFD100','#E30613',59,19713],
        ['Eyüpspor','EYU','#5C2483','#FFD100',57,14500],
        ['Kasımpaşa','KAS','#003A80','#FFFFFF',57,14234],
        ['Antalyaspor','ANS','#E30613','#FFFFFF',56,32537],
        ['Alanyaspor','ALN','#FF6600','#00843D',57,10128],
        ['Konyaspor','KON','#00843D','#FFFFFF',56,42000],
        ['Gaziantep FK','GFK','#E30613','#000000',55,33502],
        ['Çaykur Rizespor','RIZ','#00843D','#0047AB',55,15558],
        ['Kayserispor','KAY','#FFD100','#E30613',54,32864],
        ['Kocaelispor','KOC','#00843D','#000000',54,34829],
        ['Gençlerbirliği','GNC','#E30613','#000000',53,19209],
        ['Fatih Karagümrük','FKG','#E30613','#000000',52,15000]
      ]}
    ]},
  { code:'SCO', name:'Szkocja', flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿', nat:'SCO', coef:[8.375, 8.250, 4.900, 7.150, 6.000],
    leagues:[
      { id:'SCO1', name:'Premiership', tier:1, clubs:[
        ['Celtic','CLT','#018749','#FFFFFF',75,60411],
        ['Rangers','RAN','#1B458F','#FFFFFF',73,50817],
        ['Heart of Midlothian','HOM','#8E1B3E','#FFFFFF',58,19852],
        ['Hibernian','HIB','#005A3C','#FFFFFF',57,20421],
        ['Aberdeen','ABE','#C8102E','#FFFFFF',57,20866],
        ['Dundee United','DDU','#F58220','#000000',52,14223],
        ['Motherwell','MTW','#FFB81C','#8B1E3F',50,13677],
        ['St Mirren','SMI','#000000','#FFFFFF',50,7937],
        ['Kilmarnock','KIL','#0047AB','#FFFFFF',49,17889],
        ['Dundee FC','DUN','#002D72','#FFFFFF',47,11775],
        ['Livingston','LVG','#FFD100','#000000',45,9512],
        ['Falkirk','FAL','#002D72','#FFFFFF',46,8750]
      ]}
    ]},
  { code:'AUT', name:'Austria', flag:'🇦🇹', nat:'AUT', coef:[10.500, 7.100, 7.000, 6.550, 7.500],
    leagues:[
      { id:'AUT1', name:'Admiral Bundesliga', tier:1, clubs:[
        ['Red Bull Salzburg','RBS','#E30613','#FFFFFF',72,30188],
        ['Sturm Graz','STU','#000000','#FFFFFF',66,16364],
        ['Rapid Wiedeń','RAP','#00843D','#FFFFFF',64,28000],
        ['Austria Wiedeń','FAK','#5C2483','#FFFFFF',60,17656],
        ['LASK','LAS','#000000','#FFFFFF',60,19080],
        ['Wolfsberger AC','WAC','#000000','#FFFFFF',55,7300],
        ['TSV Hartberg','TSH','#0047AB','#FFFFFF',50,5000],
        ['Blau-Weiß Linz','BWL','#003A80','#FFFFFF',49,5595],
        ['Grazer AK','GAK','#E30613','#FFFFFF',48,16364],
        ['SV Ried','RIE','#00843D','#000000',47,7680],
        ['SCR Altach','ALT','#000000','#FFFFFF',46,8500],
        ['WSG Tirol','WSG','#00843D','#FFFFFF',45,5000]
      ]}
    ]},
  { code:'SUI', name:'Szwajcaria', flag:'🇨🇭', nat:'SUI', coef:[5.875, 7.775, 3.700, 8.975, 7.000],
    leagues:[
      { id:'SUI1', name:'Super League', tier:1, clubs:[
        ['FC Basel','BAS','#E30613','#0047AB',68,38512],
        ['Young Boys','YBO','#FFD100','#000000',68,31783],
        ['Servette FC','SER','#8B1E3F','#FFFFFF',60,30084],
        ['FC Lugano','LUG','#000000','#FFFFFF',60,6330],
        ['FC Luzern','LUZ','#0047AB','#FFFFFF',56,16800],
        ['FC Lausanne-Sport','LAU','#003A80','#FFFFFF',56,12544],
        ['FC St. Gallen','SGA','#00843D','#FFFFFF',56,19694],
        ['FC Zürich','ZUR','#FFFFFF','#0047AB',57,26104],
        ['Grasshopper Club','GCZ','#0047AB','#FFFFFF',51,26104],
        ['FC Sion','SIO','#E30613','#FFFFFF',53,14283],
        ['FC Thun','THU','#E30613','#FFFFFF',50,10000],
        ['FC Winterthur','WIN','#E30613','#FFFFFF',47,8550]
      ]}
    ]},
  { code:'CZE', name:'Czechy', flag:'🇨🇿', nat:'CZE', coef:[9.000, 9.000, 11.700, 9.000, 9.500],
    leagues:[
      { id:'CZE1', name:'Chance Liga', tier:1, clubs:[
        ['Slavia Praga','SLP','#E30613','#FFFFFF',70,19370],
        ['Sparta Praga','SPP','#8B1E3F','#FFFFFF',69,18887],
        ['Viktoria Pilzno','VPL','#E30613','#0047AB',66,11700],
        ['Baník Ostrawa','BAN','#0047AB','#FFFFFF',57,15123],
        ['FK Jablonec','JAB','#00843D','#000000',54,6280],
        ['Hradec Králové','HRK','#000000','#FFFFFF',51,9300],
        ['1. FC Slovácko','SLO','#0047AB','#FFFFFF',51,8121],
        ['Sigma Ołomuniec','SIG','#0047AB','#FFFFFF',53,12474],
        ['Bohemians 1905','BOH','#00843D','#FFFFFF',49,6300],
        ['FK Teplice','TEP','#FFD100','#0047AB',48,18221],
        ['Mladá Boleslav','MBO','#0047AB','#FFFFFF',51,5000],
        ['MFK Karviná','KAR','#00843D','#FFD100',47,4833],
        ['FK Pardubice','PCE','#E30613','#FFFFFF',46,5000],
        ['Dukla Praga','DUK','#8B1E3F','#FFD100',45,8150],
        ['Slovan Liberec','LIB','#0047AB','#FFFFFF',52,9900],
        ['FC Zlín','ZLI','#FFD100','#000000',46,5783]
      ]}
    ]},
  { code:'GRE', name:'Grecja', flag:'🇬🇷', nat:'GRE', coef:[6.500, 4.700, 15.250, 8.625, 9.000],
    leagues:[
      { id:'GRE1', name:'Super League', tier:1, clubs:[
        ['Olympiakos Pireus','OLY','#E30613','#FFFFFF',73,32115],
        ['PAOK Saloniki','PAK','#000000','#FFFFFF',70,28703],
        ['AEK Ateny','AEK','#FFD100','#000000',69,32500],
        ['Panathinaikos','PAO','#00843D','#FFFFFF',68,16003],
        ['Aris Saloniki','ARI','#FFD100','#000000',58,22800],
        ['OFI Kreta','OFI','#000000','#FFFFFF',50,9088],
        ['Asteras Tripolis','AST','#FFD100','#000000',48,7616],
        ['Atromitos','ATR','#0047AB','#FFFFFF',48,9000],
        ['Volos NFC','VLO','#E30613','#0047AB',46,2900],
        ['Panetolikos','PNT','#FFD100','#0047AB',46,7500],
        ['Levadiakos','LVD','#00843D','#FFFFFF',45,6262],
        ['Kifisia','KIF','#0047AB','#FFFFFF',44,4000],
        ['AEL Larisa','AEL','#8B1E3F','#FFFFFF',45,16118],
        ['Panserraikos','PSR','#E30613','#FFFFFF',43,9500]
      ]}
    ]},
  { code:'DEN', name:'Dania', flag:'🇩🇰', nat:'DEN', coef:[9.375, 6.375, 7.375, 8.700, 8.000],
    leagues:[
      { id:'DEN1', name:'Superliga', tier:1, clubs:[
        ['FC Kopenhaga','KOB','#FFFFFF','#003A80',69,38065],
        ['FC Midtjylland','MDT','#000000','#E30613',67,11800],
        ['Brøndby IF','BIF','#FFD100','#0047AB',61,28000],
        ['AGF Aarhus','AGF','#FFFFFF','#003A80',57,19433],
        ['FC Nordsjælland','NOS','#E30613','#FFD100',57,10300],
        ['Randers FC','RFC','#0047AB','#FFFFFF',52,10300],
        ['Silkeborg IF','SIF','#E30613','#FFFFFF',52,10000],
        ['Viborg FF','VFF','#00843D','#FFFFFF',50,9566],
        ['Odense BK','OBK','#0047AB','#FFFFFF',51,15790],
        ['Sønderjyske','SDJ','#0047AB','#FFFFFF',48,10000],
        ['Vejle BK','VEJ','#E30613','#FFFFFF',48,10418],
        ['FC Fredericia','FRE','#E30613','#FFFFFF',44,4000]
      ]}
    ]},
  { code:'UKR', name:'Ukraina', flag:'🇺🇦', nat:'UKR', coef:[3.300, 6.400, 6.500, 4.925, 5.500],
    leagues:[
      { id:'UKR1', name:'Premier Liha', tier:1, clubs:[
        ['Szachtar Donieck','SHA','#FF6600','#000000',72,52518],
        ['Dynamo Kijów','DYN','#FFFFFF','#003A80',70,70050],
        ['Polissia Żytomierz','PZY','#FFD100','#00843D',56,5928],
        ['FK Ołeksandrija','OLE','#FFD100','#000000',52,7000],
        ['Krywbas Krzywy Róg','KRY','#E30613','#FFFFFF',52,29734],
        ['Zoria Ługańsk','ZOR','#000000','#FFFFFF',51,22288],
        ['Karpaty Lwów','KLW','#00843D','#FFFFFF',50,28051],
        ['Ruch Lwów','RUL','#FFD100','#000000',48,6000],
        ['Weres Równe','VRS','#00843D','#000000',47,4500],
        ['Obołoń Kijów','OBO','#0047AB','#FFFFFF',46,5100],
        ['Kołos Kowaliwka','KOL','#FFD100','#00843D',46,5050],
        ['LNZ Czerkasy','LNZ','#E30613','#FFFFFF',47,10321],
        ['Metalist 1925 Charków','MKH','#FFD100','#0047AB',48,40003],
        ['Epicentr Kamieniec Podolski','EPI','#E30613','#000000',43,8500],
        ['Kudriwka','KUD','#0047AB','#FFD100',41,3000],
        ['Połtawa','PLT','#E30613','#FFFFFF',40,24795]
      ]}
    ]},
  { code:'CRO', name:'Chorwacja', flag:'🇭🇷', nat:'CRO', coef:[6.375, 4.900, 7.125, 6.625, 6.500],
    leagues:[
      { id:'CRO1', name:'HNL', tier:1, clubs:[
        ['Dinamo Zagrzeb','DIN','#0047AB','#FFFFFF',70,35123],
        ['Hajduk Split','HAJ','#FFFFFF','#003A80',63,34198],
        ['HNK Rijeka','RIJ','#FFFFFF','#0047AB',61,8279],
        ['NK Osijek','OSI','#FFFFFF','#0047AB',55,13005],
        ['NK Varaždin','VAR','#0047AB','#FFFFFF',49,8818],
        ['Lokomotiva Zagrzeb','LOK','#0047AB','#FFFFFF',48,10000],
        ['Slaven Belupo','SBE','#E30613','#FFFFFF',47,3054],
        ['NK Istra 1961','IST','#FFD100','#00843D',46,8923],
        ['HNK Gorica','GOR','#E30613','#FFFFFF',45,5200],
        ['HNK Vukovar 1991','VUK','#0047AB','#FFFFFF',42,6000]
      ]}
    ]},
  { code:'SRB', name:'Serbia', flag:'🇷🇸', nat:'SRB', coef:[9.125, 4.000, 5.750, 5.750, 6.000],
    leagues:[
      { id:'SRB1', name:'Super liga', tier:1, clubs:[
        ['Crvena zvezda','CZV','#E30613','#FFFFFF',71,53000],
        ['Partizan Belgrad','PTZ','#000000','#FFFFFF',64,29775],
        ['TSC Bačka Topola','TSC','#003A80','#FFFFFF',52,4500],
        ['Vojvodina Nowy Sad','VOJ','#E30613','#FFFFFF',53,12000],
        ['Čukarički','CUK','#000000','#FFD100',49,4070],
        ['FK Novi Pazar','NPZ','#0047AB','#FFFFFF',46,12000],
        ['Radnički 1923 Kragujevac','RKG','#E30613','#FFFFFF',47,15100],
        ['Spartak Subotica','SPS','#0047AB','#FFFFFF',45,13000],
        ['IMT Belgrad','IMT','#0047AB','#E30613',43,3000],
        ['OFK Belgrad','OFK','#0047AB','#E30613',44,13900],
        ['Železničar Pančevo','ZEL','#0047AB','#FFFFFF',42,5000],
        ['Radnik Surdulica','RSU','#E30613','#000000',41,3312],
        ['Mladost Lučani','MLA','#E30613','#FFFFFF',42,8000],
        ['Napredak Kruševac','NAK','#E30613','#FFFFFF',43,10331],
        ['Javor Ivanjica','JAV','#FFFFFF','#0047AB',40,3000],
        ['Radnički Niš','RNI','#E30613','#0047AB',44,18151]
      ]}
    ]},
  { code:'NOR', name:'Norwegia', flag:'🇳🇴', nat:'NOR', coef:[11.000, 7.375, 9.000, 11.687, 9.000],
    leagues:[
      { id:'NOR1', name:'Eliteserien', tier:1, clubs:[
        ['Bodø/Glimt','BOD','#FFD100','#000000',70,8270],
        ['Molde FK','MOL','#0047AB','#FFFFFF',63,11249],
        ['SK Brann','BRA','#E30613','#FFFFFF',60,16750],
        ['Rosenborg BK','RBK','#FFFFFF','#000000',59,21405],
        ['Viking FK','VIK','#003A80','#FFFFFF',57,15900],
        ['Fredrikstad FK','FFK','#E30613','#FFFFFF',51,12560],
        ['Sarpsborg 08','SAR','#0047AB','#FFFFFF',50,8022],
        ['Sandefjord','SFJ','#0047AB','#FFFFFF',47,6582],
        ['Tromsø IL','TIL','#E30613','#FFFFFF',50,6859],
        ['KFUM Oslo','KFU','#E30613','#000000',44,2000],
        ['HamKam','HAM','#00843D','#FFFFFF',45,7800],
        ['Strømsgodset','SGO','#0047AB','#FFFFFF',46,8935],
        ['Vålerenga','VIF','#003A80','#E30613',51,16555],
        ['Kristiansund BK','KBK','#0047AB','#FFFFFF',44,4444],
        ['Bryne FK','BRY','#E30613','#FFFFFF',42,4000],
        ['FK Haugesund','FKH','#000000','#FFFFFF',43,8754]
      ]}
    ]},
  { code:'SWE', name:'Szwecja', flag:'🇸🇪', nat:'SWE', coef:[4.875, 6.250, 6.000, 8.750, 6.500],
    leagues:[
      { id:'SWE1', name:'Allsvenskan', tier:1, clubs:[
        ['Malmö FF','MFF','#87CEEB','#003A80',64,22500],
        ['Djurgårdens IF','DIF','#0047AB','#FFD100',59,30000],
        ['Hammarby IF','HIF','#00843D','#FFFFFF',57,30000],
        ['AIK Solna','AIK','#000000','#FFD100',57,50000],
        ['BK Häcken','BKH','#FFD100','#000000',55,6500],
        ['IF Elfsborg','ELF','#FFD100','#000000',55,17800],
        ['IFK Göteborg','IFK','#0047AB','#FFFFFF',54,18416],
        ['Mjällby AIF','MJA','#FFD100','#000000',51,7000],
        ['IK Sirius','SIR','#0047AB','#000000',48,10000],
        ['GAIS','GAI','#00843D','#000000',48,18416],
        ['IF Brommapojkarna','BRP','#E30613','#000000',46,5000],
        ['Halmstads BK','HBK','#0047AB','#FFFFFF',46,10873],
        ['Degerfors IF','DEG','#E30613','#FFFFFF',44,7500],
        ['IFK Värnamo','IFV','#0047AB','#FFFFFF',43,5000],
        ['Östers IF','OST','#E30613','#FFFFFF',43,12000],
        ['IFK Norrköping','IFN','#0047AB','#FFFFFF',47,17234]
      ]}
    ]}
];

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

if (typeof module !== 'undefined') module.exports = { COUNTRIES, NATIONS, NAME_POOLS };
