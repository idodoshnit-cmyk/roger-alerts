"""Category normalisation for the census (research-census).
categorise(raw_text, name) -> (category | None, streetLevel True|False|None).  None category = not a business / drop."""
import re
from common import strip_acc

# raw strings: OSM "shop=clothes", Overture "shopping>fashion_and_apparel_store>clothing_store", FSQ "Retail > Fashion Retail > Clothing Store"
DROP = re.compile(r"bus stop|bus line|bus_station|transport hub|travel and transportation > road|moving target|states and municipalities|residential building|"
                  r"housing development|landmarks and outdoors > (structure|mountain|beach|campground|monument|garden|park|plaza|pedestrian plaza)|park > playground|"
                  r"entertainment event|event > other event|music festival|sorority|public_plaza|sports_and_recreation>park|package_locker|storage_facility|"
                  r"train_station|metro station|taxi stand|rail_facility|travel and transportation > parking|travel_and_transportation>parking|amusement park|"
                  r"skating rink|farmers market|food truck|college classroom|college library|student center|college arts building|animal shelter|"
                  r"swimming > swimming pool|conference room|historic_site|landmarks and outdoors$", re.I)

# (regex, category, streetLevel)
RULES = [
 (r"lingerie|underwear", 'lingerie', True),
 (r"bridal|wedding_dress", 'bridal', True),
 (r"children|kids|baby|nursery_store|shop=baby_goods", 'kids', True),
 (r"toy", 'toys', True),
 (r"shoe repair|shoe_repair|locksmith|tailor|shop=tailor|craft=tailor|craft=shoemaker|craft=key_cutter", 'repair', True),
 (r"shoe", 'shoes', True),
 (r"watch", 'watches', True),
 (r"jewel", 'jewellery', True),
 (r"gold_buyer|pawn", 'pawnbroker', True),
 (r"eyewear|eyecare|optic|shop=optician", 'optician', True),
 (r"perfume|perfumery|cosmetic|beauty_supply|hair_supply|skin_care_and_makeup|shop=chemist", 'cosmetics', True),
 (r"bag\b|shop=bag|luggage|fashion_accessories|fashion accessories|leather", 'bags_accessories', True),
 (r"swimwear|sportswear|sporting|sports\b|shop=sports|bike|bicycle|board store|outdoor supply", 'sports', True),
 (r"clothing|clothes|boutique|fashion|women's store|men's store|designer|outlet_store|vintage|thrift|second_hand>", 'clothes', True),
 (r"pharmacy|drugstore|drug_store", 'pharmacy', True),
 (r"currency|bureau_de_change|money_transfer", 'money_exchange', True),
 (r"bank|credit union|credit_union", 'bank', True),
 (r"atm\b", 'atm', True),
 (r"insurance", 'insurance', None),
 (r"souvlaki|grilled meat|burger|fast.?food|fried chicken|sandwich|falafel|snack|food stand|pizza|pizzeria|creperie|bagel|amenity=fast_food|hot dog", 'fast_food', True),
 (r"ice.?cream|gelato|frozen.?yogurt", 'ice_cream', True),
 (r"pastry|patisserie|confectionery|chocolat|candy|cupcake|dessert|pancake|donut|shop=pastry", 'patisserie', True),
 (r"bakery", 'bakery', True),
 (r"coffee|caf[eé]|tea room|tea_room|bubble.?tea|juice|breakfast|shop=tea", 'cafe', True),
 (r"night.?club|dance_club", 'nightclub', True),
 (r"\bbar\b|cocktail|lounge|pub\b|wine bar|wine_bar|beer|brewery|amenity=bar|amenity=pub", 'bar', True),
 (r"restaurant|steakhouse|bistro|diner|taverna|trattoria|sushi|bbq|deli\b|delicatessen|cafeteria|food_court|amenity=food_court", 'restaurant', True),
 (r"supermarket|grocery", 'supermarket', True),
 (r"convenience|mini.?market", 'convenience', True),
 (r"newsstand|kiosk|tobacco|vape|e-cigarette|lottery|bookmaker|casino|gaming_venue|shop=lottery", 'kiosk_tobacco_betting', True),
 (r"liquor|wine|cava|shop=alcohol", 'wine_spirits', True),
 (r"butcher|greengrocer|produce|cheese|dairy|seafood_market|fish|gourmet|health.?food|specialty_foods|supplement|vitamin|shop=deli|shop=farm|food and beverage retail|food_and_beverage_store|shop=nuts|shop=spices|shop=herbalist", 'food_shop', True),
 (r"book|stationery|office supply|shop=stationery|shop=newsagent", 'bookshop', True),
 (r"mobile.?phone|telecommunications|shop=telecommunication", 'telecom', True),
 (r"electronics|computer|camera|audio_visual|video store|shop=hifi|shop=appliance|it_service|it service|repair service|electronics_repair", 'electronics', True),
 (r"photography lab|photography studio|photo|photography", 'photo', True),
 (r"florist|flower|garden.?cent", 'florist', True),
 (r"gift|souvenir|shop=gift", 'gifts', True),
 (r"carpet|rug", 'carpets', True),
 (r"furniture|mattress|bed\b|bedding|home_goods|home store|interior_decoration|home_improvement|kitchen|lighting|curtain|houseware|shop=bathroom|antique|shop=antiques", 'home_decor', True),
 (r"textiles|fabric|arts.?(and|&)?.?crafts|arts_crafts|hobby|music store|musical_instrument|shop=craft|shop=art\b|shop=frame|shop=sewing|shop=haberdashery", 'crafts_hobby', True),
 (r"hardware|construction supplies|paint|shop=doityourself", 'hardware', True),
 (r"pet", 'pet', True),
 (r"barber", 'barber', True),
 (r"hair", 'hairdresser', True),
 (r"nail|tanning|tattoo|spa\b|massage|beauty|waxing|teeth_whitening|wellness", 'beauty', True),
 (r"dry.?clean|laundry", 'dry_cleaning', True),
 (r"travel.?agen|travel_service|travel service", 'travel', True),
 (r"real.?estate|estate_agent", 'real_estate', None),
 (r"art.?gallery|gallery|exhibit", 'gallery', True),
 (r"museum", 'museum', True),
 (r"movie|cinema", 'cinema', True),
 (r"theat|performing|concert|music venue|arts_centre", 'theatre', True),
 (r"bowling", 'bowling', True),
 (r"hotel|lodging|guest_house|hostel|holiday_rental|apartment", 'hotel', True),
 (r"dentist|dental|orthodont|periodont", 'dentist', False),
 (r"veterinar", 'vet', True),
 (r"hospital|emergency room|medical center|clinic\b|amenity=clinic", 'clinic', None),
 (r"doctor|physician|dermatolog|surgery|cardiolog|gynecolog|psycholog|psychiatr|optometr|nutrition|medical|health_care|health and medicine|healthcare=|"
  r"physiotherap|counseling|acupuncture|naturopath|ear_nose|gastroenter|anesthesi|hearing|laborator|lab\b", 'doctor', False),
 (r"gym|fitness|pilates|yoga|dance studio|dance_studio|sport_or_fitness|sports_centre|martial|sports and recreation|sports_and_recreation", 'gym', None),
 (r"kindergarten|preschool|nursery school|daycare|day_care|childcare", 'kindergarten', None),
 (r"driving school|driving_school", 'driving_school', True),
 (r"language school|language_school|music school|music_school|trade school|tutor|school|college|university|education", 'school', None),
 (r"church|place_of_worship|spiritual", 'church', True),
 (r"post.?office|shipping|courier|freight", 'post_courier', True),
 (r"police", 'police', True),
 (r"town.?hall|government|embassy|consulate|community_centre|community center|library|social_or_community|political|utility|energy_supplier|public_facility", 'public', None),
 (r"fuel|gas station", 'fuel', True),
 (r"car dealer|auto_dealer|car_dealer|vehicle_dealer|automotive|car_repair|vehicle_service|shop=car|motorcycle", 'car', True),
 (r"funeral", 'funeral', True),
 (r"shopping.?mall|shopping plaza|department.?store|shop=mall", 'mall', True),
 (r"lawyer|attorney|law office|notary|legal", 'lawyer', False),
 (r"architect|engineer|advertising|marketing|graphic|design_service|media_service|tech startup|corporate|office|professional|consult|accountant|financial|"
  r"event_or_party|party_and_event|wedding_planning|event space|business center|convention|manufacturer|factory|non-profit|organization|charity|home_service|hvac|"
  r"business and professional services|services_and_business", 'office', False),
]
RULES = [(re.compile(a, re.I), b, c) for a, b, c in RULES]

# fallback on the name when the category is missing/generic
NAME_RULES = [
 (r"φαρμακει|pharmac|farmak", 'pharmacy', True), (r"περιπτερ|kiosk|periptero", 'kiosk_tobacco_betting', True),
 (r"κομμωτ|hair|coiff", 'hairdresser', True), (r"optic|οπτικ", 'optician', True), (r"κοσμημα|jewel|bijoux|gold|χρυσοχο", 'jewellery', True),
 (r"cafe|καφε|coffee|espresso", 'cafe', True), (r"φουρνος|bakery|αρτοποι", 'bakery', True), (r"ζαχαροπλαστ|patisserie|sweets", 'patisserie', True),
 (r"ταβερνα|restaurant|εστιατορ|trattoria|osteria|grill|ψητοπωλ|σουβλακ|pizza|sushi|burger", 'restaurant', True),
 (r"\bbar\b", 'bar', True), (r"boutique|fashion|moda|wear|μοδα|ενδυμα", 'clothes', True), (r"shoes|υποδημα|παπουτσ", 'shoes', True),
 (r"ανθοπωλ|flowers|florist", 'florist', True), (r"βιβλιοπωλ|books", 'bookshop', True), (r"nails|beauty|ομορφι|αισθητικ|spa\b", 'beauty', True),
 (r"οδοντιατρ|dental|dentist", 'dentist', False), (r"ιατρ|doctor|\bdr\b|clinic|κλινικη|physio|φυσικοθεραπ|φυσιοθεραπ|dermat|δερματολογ|medical|ορθοπ", 'doctor', False),
 (r"δικηγορ|law\b|lawyer|συμβολαιογραφ", 'lawyer', False), (r"real estate|μεσιτικ|properties|realty|ακινητ", 'real_estate', None),
 (r"hotel|ξενοδοχ|suites", 'hotel', True), (r"gallery|γκαλερι", 'gallery', True), (r"super ?market|σουπερ ?μαρκετ|market", 'supermarket', True),
 (r"τραπεζα|bank", 'bank', True), (r"σχολ|school|φροντιστηρ|college|academy|ακαδημια", 'school', None), (r"gym|fitness|pilates|yoga", 'gym', None),
 (r"home|deco|interiors|επιπλ|furniture|casa", 'home_decor', True), (r"kids|παιδικ|baby|bebe", 'kids', True), (r"toys|παιχνιδ", 'toys', True),
 (r"travel|ταξιδ", 'travel', True), (r"cleaners|καθαριστηρ", 'dry_cleaning', True), (r"architect|αρχιτεκτ|engineering|μηχανικ|consult", 'office', False),
]
NAME_RULES = [(re.compile(a, re.I), b, c) for a, b, c in NAME_RULES]
GENERIC = {'shop', 'shopping', 'retail', 'none', '', 'retail > miscellaneous store', 'shop=yes'}

def categorise(raw, name=''):
    raw = (raw or '').strip()
    if raw and DROP.search(raw): return (None, None)
    low = raw.lower()
    if low not in GENERIC:
        for rx, cat, sl in RULES:
            if rx.search(low): return (cat, sl)
    n = strip_acc(name or '').lower()
    for rx, cat, sl in NAME_RULES:
        if rx.search(n): return (cat, sl)
    if low in GENERIC or not raw: return ('shop', None)
    if low.startswith(('shop=', 'retail', 'shopping')): return ('shop', True)
    if low.startswith(('office=', 'craft=')): return ('office', None)
    if low.startswith(('dining', 'food_and_drink')): return ('restaurant', True)
    return ('other', None)
