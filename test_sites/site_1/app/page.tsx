import Image from "next/image";

// Inline SVG components for stability
const ShoppingCart = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
);

const Star = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
);

const Search = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);

const Filter = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
);

const ArrowRight = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);

// Fallback Mock Data for offline/restricted environments
const MOCK_PRODUCTS = [
  { id: 101, title: "Quantum Watch", description: "A masterpiece of time engineering with holographic display.", price: 1299, rating: 4.9, category: "Luxury", thumbnail: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80", discountPercentage: 10 },
  { id: 102, title: "Neural Headphones", description: "Direct brain-sync audio technology for immersive soundscapes.", price: 549, rating: 4.8, category: "Tech", thumbnail: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80", discountPercentage: 15 },
  { id: 103, title: "Aether Sneakers", description: "Levitation-grade comfort for the modern urban explorer.", price: 280, rating: 4.7, category: "Lifestlye", thumbnail: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80", discountPercentage: 20 },
  { id: 104, title: "Prism Camera", description: "Capture the spectrum of light in breathtaking 16K detail.", price: 3400, rating: 5.0, category: "Photography", thumbnail: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&q=80", discountPercentage: 5 },
  { id: 105, title: "Carbon Backpack", description: "Ultra-lightweight, indestructible travel companion.", price: 195, rating: 4.6, category: "Travel", thumbnail: "https://images.unsplash.com/photo-1553062407-98eeb94c6a62?w=500&q=80", discountPercentage: 12 },
  { id: 106, title: "Solar Desk Lamp", description: "Sustainable ambient lighting with gesture control.", price: 89, rating: 4.5, category: "Home", thumbnail: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500&q=80", discountPercentage: 8 },
  { id: 107, title: "Zen Keyboard", description: "Mechanical precision with silent tactile feedback.", price: 210, rating: 4.9, category: "Tech", thumbnail: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=500&q=80", discountPercentage: 25 },
  { id: 108, title: "Infinity Bottle", description: "Self-cleaning water bottle with temperature retention.", price: 65, rating: 4.4, category: "Lifestyle", thumbnail: "https://images.unsplash.com/photo-1602143303410-7199d113565f?w=500&q=80", discountPercentage: 30 },
  { id: 109, title: "Velvet Chair", description: "Ergonomic luxury for the discerning office space.", price: 850, rating: 4.7, category: "Furniture", thumbnail: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=500&q=80", discountPercentage: 18 },
  { id: 110, title: "Ember Candle", description: "Atmospheric scent with 100-hour burn time.", price: 45, rating: 4.8, category: "Home", thumbnail: "https://images.unsplash.com/photo-1602872030219-cbf917a803f8?w=500&q=80", discountPercentage: 5 },
  { id: 111, title: "Titanium Pen", description: "Balanced perfection for the art of writing.", price: 120, rating: 4.9, category: "Accessories", thumbnail: "https://images.unsplash.com/photo-1583484963886-cfe2bef2945f?w=500&q=80", discountPercentage: 0 },
  { id: 112, title: "Nova Projector", description: "Transform any wall into a private cinema.", price: 980, rating: 4.6, category: "Tech", thumbnail: "https://images.unsplash.com/photo-1535016120720-40c646bebbfc?w=500&q=80", discountPercentage: 12 }
];

async function getProducts() {
  try {
    const res = await fetch("https://dummyjson.com/products?limit=32", {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000) // 5s timeout
    });
    if (!res.ok) return MOCK_PRODUCTS;
    const data = await res.json();
    return data.products && data.products.length > 0 ? data.products : MOCK_PRODUCTS;
  } catch (error) {
    console.error("Fetch failed, using mock data", error);
    return MOCK_PRODUCTS;
  }
}

export default async function Home() {
  const products = await getProducts();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Premium Navbar */}
      <nav className="sticky top-0 z-50 w-full glass border-b border-border/40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-bold text-2xl">S</span>
            </div>
            <span className="text-2xl font-black tracking-tighter text-foreground">STOCKBUD</span>
          </div>
          
          <div className="hidden lg:flex items-center gap-10 text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors cursor-pointer">Shop All</a>
            <a href="#" className="hover:text-primary transition-colors cursor-pointer">Categories</a>
            <a href="#" className="hover:text-primary transition-colors cursor-pointer">Collections</a>
            <a href="#" className="hover:text-primary transition-colors cursor-pointer">Our Story</a>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2.5 hover:bg-accent rounded-full transition-all hover:scale-110 active:scale-95">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-2.5 hover:bg-accent rounded-full transition-all hover:scale-110 active:scale-95 relative group">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] flex items-center justify-center rounded-full font-bold border-2 border-background group-hover:animate-bounce">
                4
              </span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        {/* Hero Banner */}
        <section className="relative overflow-hidden bg-zinc-950 text-white py-24 lg:py-32">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500 via-purple-500 to-pink-500 blur-3xl"></div>
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="max-w-3xl">
              <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-white/90 text-xs font-bold uppercase tracking-widest mb-6 backdrop-blur-md border border-white/10">
                New Spring Collection 2024
              </span>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 leading-[0.9]">
                ELEVATE YOUR <br />
                <span className="text-gradient">LIFESTYLE.</span>
              </h1>
              <p className="text-zinc-400 text-xl md:text-2xl mb-10 leading-relaxed font-medium">
                Experience the perfect blend of innovation and aesthetics. Our new collection defines the future of premium living.
              </p>
              <div className="flex flex-wrap gap-4">
                <button className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-zinc-200 transition-all flex items-center gap-2 group">
                  Shop Collection
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </button>
                <button className="px-8 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-full hover:bg-white/10 transition-all">
                  View Lookbook
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Catalog Section */}
        <section className="py-24 px-6 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-end justify-between gap-6 mb-16">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">Our Catalog</h2>
              <p className="text-muted-foreground font-medium">Explore our meticulously curated selection of products.</p>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 px-6 py-3 border border-border rounded-xl font-bold hover:bg-accent transition-all">
                <Filter className="w-4 h-4" />
                Filter
              </button>
              <div className="h-10 w-[1px] bg-border/60 mx-2 hidden md:block"></div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                Showing {products.length} Results
              </p>
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
            {products.map((product: any) => (
              <div key={product.id} className="group flex flex-col product-card-hover cursor-pointer">
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 mb-6 border border-border/40">
                  <Image
                    src={product.thumbnail}
                    alt={product.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button className="bg-white text-black px-6 py-3 rounded-full font-bold transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-xl">
                      Quick View
                    </button>
                  </div>
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-white/90 dark:bg-black/90 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                      {product.category}
                    </span>
                  </div>
                  {product.discountPercentage > 15 && (
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 bg-red-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20">
                        -{Math.round(product.discountPercentage)}%
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-1 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-3 h-3 ${i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-zinc-300 dark:text-zinc-700"}`} 
                        />
                      ))}
                      <span className="text-[10px] font-bold text-muted-foreground ml-1">({product.rating})</span>
                    </div>
                  </div>
                  <h3 className="font-bold text-xl tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                    {product.title}
                  </h3>
                  <p className="text-muted-foreground text-sm line-clamp-2 mb-4 font-medium leading-relaxed">
                    {product.description}
                  </p>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black">${product.price}</span>
                      <span className="text-sm text-muted-foreground line-through decoration-red-500/40">
                        ${Math.round(product.price * (1 + (product.discountPercentage || 0) / 100))}
                      </span>
                    </div>
                    <button className="w-12 h-12 rounded-full border-2 border-border flex items-center justify-center hover:bg-primary hover:border-primary hover:text-primary-foreground transition-all">
                      <ShoppingCart className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="bg-zinc-100 dark:bg-zinc-900 py-24 px-6 border-y border-border/40">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter">JOIN THE INNER CIRCLE.</h2>
            <p className="text-muted-foreground text-lg font-medium">
              Subscribe to get special offers, free giveaways, and once-in-a-lifetime deals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <input 
                type="email" 
                placeholder="Enter your email address" 
                className="flex-grow px-6 py-4 rounded-2xl bg-background border border-border focus:ring-2 focus:ring-primary outline-none font-medium transition-all"
              />
              <button className="px-10 py-4 bg-primary text-primary-foreground rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                Subscribe
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-20 px-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-black tracking-tighter">STOCKBUD</span>
            </div>
            <p className="text-muted-foreground font-medium leading-relaxed">
              Leading the digital frontier of luxury shopping. Curating the world's finest goods for your modern lifestyle.
            </p>
          </div>
          <div>
            <h4 className="font-black text-sm uppercase tracking-widest mb-8">Shop Collections</h4>
            <ul className="space-y-4 text-muted-foreground font-medium">
              <li><a href="#" className="hover:text-primary transition-colors">Tech Essentials</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Smart Watches</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Lifestyle Gear</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Premium Fragrances</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black text-sm uppercase tracking-widest mb-8">Company</h4>
            <ul className="space-y-4 text-muted-foreground font-medium">
              <li><a href="#" className="hover:text-primary transition-colors">About Stockbud</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Sustainability</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black text-sm uppercase tracking-widest mb-8">Connect</h4>
            <ul className="space-y-4 text-muted-foreground font-medium">
              <li><a href="#" className="hover:text-primary transition-colors">Instagram</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Twitter</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Discord</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Support Center</a></li>
            </ul>
          </div>
        </div>
        <div className="pt-10 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-muted-foreground font-medium">© 2024 STOCKBUD. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-8 text-xs font-bold text-muted-foreground uppercase tracking-widest">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Cookies</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
