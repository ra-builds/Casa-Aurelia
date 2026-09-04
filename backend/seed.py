"""Seed database with admin user, menu, restaurant config, and legacy restaurant settings."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.core.config import get_settings
from app.core.security import get_password_hash
from app.db.database import SessionLocal, init_db
from app.models.category import Category
from app.models.menu_item import MenuItem
from app.models.restaurant import Restaurant
from app.models.restaurant_setting import RestaurantSetting
from app.models.user import User

settings = get_settings()

CATEGORIES = [
    {"name": "Antipasti", "slug": "antipasti", "sort_order": 1},
    {"name": "Primi", "slug": "primi", "sort_order": 2},
    {"name": "Secondi", "slug": "secondi", "sort_order": 3},
    {"name": "Dolci", "slug": "dolci", "sort_order": 4},
    {"name": "Drinks", "slug": "drinks", "sort_order": 5},
]

UNSPLASH_BASE = "https://images.unsplash.com/photo-{photo_id}?auto=format&fit=crop&w=1000&q=80"

# Curated food photography (verified live URLs) seeded into menu items.
# Admin uploads replace these per item; backfill only ever fills NULL image_url.
DISH_IMAGES = {
    "Burrata Pugliese": "1621072156002-e2fccdc0b176",
    "Carpaccio di Manzo": "1623479322729-28b25c16b011",
    "Polpo alla Griglia": "1598866594230-a7c12756260f",
    "Bruschetta al Pomodoro": "1572695157366-5e585ab2b69f",
    "Tagliatelle al Tartufo": "1473093295043-cdd812d0e601",
    "Risotto ai Funghi": "1476124369491-e7addf5db371",
    "Ravioli di Ricotta": "1601050690597-df0568f70950",
    "Spaghetti alle Vongole": "1585032226651-759b368d7246",
    "Branzino al Limone": "1559847844-5315695dadae",
    "Filetto di Manzo": "1600891964092-4316c288032e",
    "Pollo alla Milanese": "1626082927389-6cd097cdc6ec",
    "Melanzane alla Parmigiana": "1629115916087-7e8c114a24ed",
    "Tiramisù": "1571877227200-a0d98ea607e9",
    "Panna Cotta": "1488477181946-6428a0291777",
    "Cannolo Siciliano": "1606312619070-d48b4c652a52",
    "Affogato al Caffè": "1517701550927-30cf4ba1dba5",
    "Negroni Classico": "1514362545857-3bc16c4c7d1b",
    "Aperol Spritz": "1560512823-829485b8bf24",
    "Barolo DOCG": "1510812431401-41d2bd2722f3",
    "San Pellegrino": "1536935338788-846bb9981813",
}

MENU_ITEMS = [
    # Antipasti
    {"category": "antipasti", "name": "Burrata Pugliese", "description": "Creamy burrata from Puglia with heirloom tomatoes, basil oil, and aged balsamic.", "price": 16.00, "dietary_info": "Vegetarian", "is_featured": True},
    {"category": "antipasti", "name": "Carpaccio di Manzo", "description": "Thinly sliced beef with rocket, parmesan shavings, and truffle dressing.", "price": 18.00, "dietary_info": None, "is_featured": False},
    {"category": "antipasti", "name": "Polpo alla Griglia", "description": "Chargrilled octopus with potato purée, capers, and lemon emulsion.", "price": 19.00, "dietary_info": "Gluten-Free", "is_featured": True},
    {"category": "antipasti", "name": "Bruschetta al Pomodoro", "description": "Grilled sourdough topped with San Marzano tomatoes, garlic, and fresh basil.", "price": 12.00, "dietary_info": "Vegan", "is_featured": False},
    # Primi
    {"category": "primi", "name": "Tagliatelle al Tartufo", "description": "Hand-cut tagliatelle with black truffle butter, parmesan, and fresh herbs.", "price": 28.00, "dietary_info": "Vegetarian", "is_featured": True},
    {"category": "primi", "name": "Risotto ai Funghi", "description": "Carnaroli risotto with wild mushrooms, white wine, and aged pecorino.", "price": 24.00, "dietary_info": "Vegetarian", "is_featured": False},
    {"category": "primi", "name": "Ravioli di Ricotta", "description": "House-made ricotta ravioli with sage butter and toasted pine nuts.", "price": 22.00, "dietary_info": "Vegetarian", "is_featured": True},
    {"category": "primi", "name": "Spaghetti alle Vongole", "description": "Spaghetti with fresh clams, white wine, garlic, and parsley.", "price": 26.00, "dietary_info": None, "is_featured": False},
    # Secondi
    {"category": "secondi", "name": "Branzino al Limone", "description": "Pan-seared sea bass with lemon caper sauce and seasonal vegetables.", "price": 32.00, "dietary_info": "Gluten-Free", "is_featured": True},
    {"category": "secondi", "name": "Filetto di Manzo", "description": "Grilled beef fillet with red wine reduction and rosemary potatoes.", "price": 38.00, "dietary_info": None, "is_featured": True},
    {"category": "secondi", "name": "Pollo alla Milanese", "description": "Crisp breaded chicken cutlet with arugula salad and cherry tomatoes.", "price": 26.00, "dietary_info": None, "is_featured": False},
    {"category": "secondi", "name": "Melanzane alla Parmigiana", "description": "Layered aubergine with tomato, mozzarella, and basil — baked until golden.", "price": 22.00, "dietary_info": "Vegetarian", "is_featured": False},
    # Dolci
    {"category": "dolci", "name": "Tiramisù", "description": "Classic mascarpone tiramisu with espresso-soaked savoiardi and cocoa.", "price": 12.00, "dietary_info": "Vegetarian", "is_featured": True},
    {"category": "dolci", "name": "Panna Cotta", "description": "Vanilla panna cotta with seasonal berry compote.", "price": 10.00, "dietary_info": "Vegetarian", "is_featured": False},
    {"category": "dolci", "name": "Cannolo Siciliano", "description": "Crisp pastry shell filled with sweet ricotta, pistachio, and candied orange.", "price": 11.00, "dietary_info": "Vegetarian", "is_featured": True},
    {"category": "dolci", "name": "Affogato al Caffè", "description": "Vanilla gelato drowned in hot espresso — simple and sublime.", "price": 8.00, "dietary_info": "Vegetarian", "is_featured": False},
    # Drinks
    {"category": "drinks", "name": "Negroni Classico", "description": "Gin, Campari, and sweet vermouth with an orange twist.", "price": 14.00, "dietary_info": None, "is_featured": False},
    {"category": "drinks", "name": "Aperol Spritz", "description": "Aperol, prosecco, and soda served over ice with a green olive.", "price": 12.00, "dietary_info": None, "is_featured": True},
    {"category": "drinks", "name": "Barolo DOCG", "description": "Full-bodied Piedmontese red — glass or bottle available.", "price": 16.00, "dietary_info": None, "is_featured": False},
    {"category": "drinks", "name": "San Pellegrino", "description": "Sparkling mineral water — 750ml.", "price": 6.00, "dietary_info": "Vegan", "is_featured": False},
]

RESTAURANT_SETTINGS = {
    "name": "Casa Aurelia",
    "tagline": "Modern Italian cuisine in the heart of Novara",
    "address": "Via Roma 42, 28100 Novara, Italy",
    "phone": "+39 0321 123 456",
    "email": "info@casaaurelia.it",
    "capacity": "40",
    "lunch_hours": "12:00 – 14:00",
    "dinner_hours": "19:00 – 22:00",
    "closed_day": "Monday",
}


def seed():
    init_db()
    db = SessionLocal()

    try:
        if not db.query(User).filter(User.email == settings.admin_email).first():
            admin = User(
                email=settings.admin_email,
                hashed_password=get_password_hash(settings.admin_password),
                full_name="Casa Aurelia Admin",
                is_active=True,
                role="admin",
            )
            db.add(admin)
            print(f"Created admin user: {settings.admin_email}")

        category_map = {}
        for cat_data in CATEGORIES:
            existing = db.query(Category).filter(Category.slug == cat_data["slug"]).first()
            if not existing:
                cat = Category(**cat_data)
                db.add(cat)
                db.flush()
                category_map[cat_data["slug"]] = cat.id
                print(f"Created category: {cat_data['name']}")
            else:
                category_map[cat_data["slug"]] = existing.id

        db.commit()

        for i, item_data in enumerate(MENU_ITEMS):
            cat_id = category_map[item_data["category"]]
            existing = db.query(MenuItem).filter(MenuItem.name == item_data["name"]).first()
            if not existing:
                item = MenuItem(
                    category_id=cat_id,
                    name=item_data["name"],
                    description=item_data["description"],
                    price=item_data["price"],
                    dietary_info=item_data["dietary_info"],
                    is_featured=item_data["is_featured"],
                    sort_order=i + 1,
                    image_url=(
                        UNSPLASH_BASE.format(photo_id=DISH_IMAGES[item_data["name"]])
                        if item_data["name"] in DISH_IMAGES
                        else None
                    ),
                )
                db.add(item)

        for name, photo_id in DISH_IMAGES.items():
            missing = db.query(MenuItem).filter(MenuItem.name == name, MenuItem.image_url.is_(None)).first()
            if missing:
                missing.image_url = UNSPLASH_BASE.format(photo_id=photo_id)
                print(f"Backfilled image for: {missing.name}")

        for key, value in RESTAURANT_SETTINGS.items():
            existing = db.query(RestaurantSetting).filter(RestaurantSetting.key == key).first()
            if not existing:
                db.add(RestaurantSetting(key=key, value=value))

        restaurant = db.query(Restaurant).first()
        if not restaurant:
            restaurant = Restaurant(
                name="Casa Aurelia",
                tagline="Modern Italian cuisine in the heart of Novara",
                address="Via Roma 42, 28100 Novara, Italy",
                city="Novara",
                country="Italy",
                phone="+39 0321 123 456",
                email="info@casaaurelia.it",
                currency="EUR",
                lunch_hours="12:00 – 14:00",
                dinner_hours="19:00 – 22:00",
                closed_day="Monday",
                capacity=settings.restaurant_capacity,
                social_links=json.dumps({
                    "instagram": "https://www.instagram.com/casaaurelia",
                    "facebook": "https://www.facebook.com/casaaurelia",
                    "tripadvisor": "https://www.tripadvisor.com/casaaurelia",
                }),
            )
            db.add(restaurant)
            print("Created restaurant config")
        elif not restaurant.social_links:
            restaurant.social_links = json.dumps({
                "instagram": "https://www.instagram.com/casaaurelia",
                "facebook": "https://www.facebook.com/casaaurelia",
                "tripadvisor": "https://www.tripadvisor.com/casaaurelia",
            })
            print("Updated restaurant social links")

        db.commit()
        print("Database seeded successfully!")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
