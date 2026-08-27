from pydantic import BaseModel, Field


class CategoryResponse(BaseModel):
    id: int
    name: str
    slug: str
    sort_order: int

    model_config = {"from_attributes": True}


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    slug: str | None = Field(default=None, max_length=100)
    sort_order: int = Field(default=0, ge=0)


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    slug: str | None = Field(default=None, max_length=100)
    sort_order: int | None = Field(default=None, ge=0)


class AllergenResponse(BaseModel):
    code: str
    name: str

    model_config = {"from_attributes": True}


class MenuItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=2000)
    price: float = Field(ge=0)
    category_id: int
    dietary_info: str | None = Field(default=None, max_length=100)
    is_available: bool = True
    is_featured: bool = False
    sort_order: int = 0
    allergen_codes: list[str] = Field(default_factory=list)


class MenuItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1, max_length=2000)
    price: float | None = Field(default=None, ge=0)
    category_id: int | None = None
    dietary_info: str | None = Field(default=None, max_length=100)
    is_available: bool | None = None
    is_featured: bool | None = None
    sort_order: int | None = None
    allergen_codes: list[str] | None = None


class MenuItemResponse(BaseModel):
    id: int
    category_id: int
    name: str
    description: str
    price: float
    dietary_info: str | None
    image_url: str | None = None
    is_featured: bool
    is_available: bool
    sort_order: int
    category: CategoryResponse | None = None
    allergens: list[AllergenResponse] = []

    model_config = {"from_attributes": True}


class MenuResponse(BaseModel):
    categories: list[CategoryResponse]
    items: list[MenuItemResponse]
