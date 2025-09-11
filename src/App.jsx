import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const categories = [
    { name: 'All', tag: '' },
    { name: 'Motivational', tag: 'motivational' },
    { name: 'Wisdom', tag: 'wisdom' },
    { name: 'Success', tag: 'success' },
    { name: 'Inspirational', tag: 'inspirational' },
    { name: 'Famous Quotes', tag: 'famous-quotes' }
  ];

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showFavorites, setShowFavorites] = useState(false);

  useEffect(() => {
    const savedFavorites = localStorage.getItem('quoteFavorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('quoteFavorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    document.body.className = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  
  useEffect(() => {
    handleClick(); // Load initial quote
  }, []);

  const getWikipediaUrl = (authorName) => {
    const cleanName = authorName
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '_');
    
    return `https://en.wikipedia.org/wiki/${encodeURIComponent(cleanName)}`;
  };

  const checkWikipediaExists = async (authorName) => {
    try {
      const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(authorName)}`;
      const response = await fetch(searchUrl);
      
      if (response.ok) {
        const data = await response.json();
        return {
          exists: true,
          url: data.content_urls?.desktop?.page || getWikipediaUrl(authorName),
          title: data.title || authorName
        };
      }
    } catch (error) {
      console.log(`Wikipedia check failed for ${authorName}`);
    }
    
    return {
      exists: false,
      url: getWikipediaUrl(authorName),
      title: authorName
    };
  };

  const fetchWikipediaData = async (author) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Shorter timeout for Wikipedia
    
      const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(author)}`;
      const response = await fetch(searchUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Quote-It-App/1.0'
        }
      });
    
      clearTimeout(timeoutId);
    
      if (response.ok) {
        const data = await response.json();
        return {
          exists: true,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(author)}`,
          extract: data.extract
        };
      }
    } catch (error) {
      console.log('Wikipedia fetch failed for:', author, error.message);
    }
    
    return {
      exists: false,
      url: '#'
    };
  };

  const fetchAuthorImage = async (author) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // Short timeout for images
    
      const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(author)}`;
      const response = await fetch(searchUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Quote-It-App/1.0'
        }
      });
    
      clearTimeout(timeoutId);
    
      if (response.ok) {
        const data = await response.json();
        if (data.thumbnail && data.thumbnail.source) {
          return data.thumbnail.source;
        }
      }
    } catch (error) {
      console.log('Author image fetch failed for:', author, error.message);
    }
    
    // Always return UI Avatar fallback
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(author)}&size=150&background=gradient&color=fff`;
  };

  //  mobile-compatible version
  const fetchQuoteFromAPI = async (category = '') => {
    // multiple API endpoints for mobile compatibility
    const apiAttempts = [
      // Primary API
      {
        url: category 
          ? `https://api.quotable.io/random?tags=${category}`
          : 'https://api.quotable.io/random',
        type: 'quotable'
      },
      // Backup API through CORS proxy
      {
        url: category
          ? `https://cors-anywhere.herokuapp.com/https://api.quotable.io/random?tags=${category}`
          : 'https://cors-anywhere.herokuapp.com/https://api.quotable.io/random',
        type: 'quotable-proxy'
      },
      // Alternative quote API
      {
        url: 'https://zenquotes.io/api/random',
        type: 'zenquotes'
      }
    ];

    for (let i = 0; i < apiAttempts.length; i++) {
      const attempt = apiAttempts[i];
      console.log(`Mobile API attempt ${i + 1}:`, attempt.url);
      
      try {
        const response = await fetch(attempt.url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            ...(attempt.type === 'quotable-proxy' && {
              'X-Requested-With': 'XMLHttpRequest'
            })
          },
          mode: 'cors'
        });

        console.log(`Attempt ${i + 1} status:`, response.status);

        if (response.ok) {
          const data = await response.json();
          console.log(`Attempt ${i + 1} data:`, data);

          // Normalize response based on API type
          if (attempt.type === 'zenquotes') {
            const quote = Array.isArray(data) ? data[0] : data;
            return {
              content: quote.q || quote.text,
              author: quote.a || quote.author,
              tags: category ? [category] : ['wisdom']
            };
          } else {
            // Quotable API format
            return {
              content: data.content || data.text,
              author: data.author,
              tags: data.tags || []
            };
          }
        }
      } catch (error) {
        console.error(`API attempt ${i + 1} failed:`, error);
        continue; // Try next API
      }
    }
    
    // If all APIs fail, throw error
    throw new Error('All quote APIs failed on mobile');
  };

  // Simplified handleClick that focuses on just getting quotes working
  const handleClick = async () => {
    setLoading(true);
    console.log('=== MOBILE QUOTE GENERATION START ===');
    
    try {
      let quoteData;
      
      if (showFavorites && favorites.length > 0) {
        console.log('Using favorites');
        quoteData = favorites[Math.floor(Math.random() * favorites.length)];
        setQuote(quoteData);
      } else {
        console.log('Fetching new quote for mobile...');
        quoteData = await fetchQuoteFromAPI(selectedCategory);
        console.log('Mobile quote success:', quoteData);
        
        // basic quote without Wikipedia enhancement for mobile
        const basicQuote = {
          text: quoteData.content || quoteData.text,
          author: quoteData.author,
          tags: quoteData.tags || [],
          image: `https://ui-avatars.com/api/?name=${encodeURIComponent(quoteData.author)}&size=150&background=random&color=fff`,
          wikipedia: { 
            exists: true, 
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(quoteData.author)}` 
          }
        };
        
        setQuote(basicQuote);
        console.log('Mobile quote set successfully');
      }
    } catch (error) {
      console.error('=== MOBILE QUOTE FAILED ===', error);
      
      // Mobile-specific fallback quotes
      const mobileFallbacks = [
        {
          text: "The future belongs to those who believe in the beauty of their dreams.",
          author: "Eleanor Roosevelt",
          tags: ["inspirational"],
          image: "https://ui-avatars.com/api/?name=Eleanor+Roosevelt&size=150&background=random&color=fff",
          wikipedia: { exists: true, url: "https://en.wikipedia.org/wiki/Eleanor_Roosevelt" }
        },
        {
          text: "It is during our darkest moments that we must focus to see the light.",
          author: "Aristotle",
          tags: ["wisdom"],
          image: "https://ui-avatars.com/api/?name=Aristotle&size=150&background=random&color=fff",
          wikipedia: { exists: true, url: "https://en.wikipedia.org/wiki/Aristotle" }
        },
        {
          text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
          author: "Winston Churchill",
          tags: ["success"],
          image: "https://ui-avatars.com/api/?name=Winston+Churchill&size=150&background=random&color=fff",
          wikipedia: { exists: true, url: "https://en.wikipedia.org/wiki/Winston_Churchill" }
        }
      ];
      
      const randomFallback = mobileFallbacks[Math.floor(Math.random() * mobileFallbacks.length)];
      setQuote(randomFallback);
      console.log('Using mobile fallback quote');
    } finally {
      setLoading(false);
      console.log('=== MOBILE QUOTE GENERATION END ===');
    }
  };

  const toggleFavorite = () => {
    if (!quote) return;
    
    const quoteExists = favorites.find(fav => fav.text === quote.text && fav.author === quote.author);
    
    if (quoteExists) {
      setFavorites(favorites.filter(fav => !(fav.text === quote.text && fav.author === quote.author)));
    } else {
      setFavorites([...favorites, quote]);
    }
  };

  const isQuoteFavorited = () => {
    if (!quote) return false;
    return favorites.some(fav => fav.text === quote.text && fav.author === quote.author);
  };

  const showRandomFavorite = () => {
    if (favorites.length === 0) return;
    const randomIndex = Math.floor(Math.random() * favorites.length);
    setQuote(favorites[randomIndex]);
  };

  const handleCategoryChange = async (category) => {
    setSelectedCategory(category);
    setShowFavorites(false);
    
    if (category === '' || category !== selectedCategory) {
      setLoading(true);
      try {
        const newQuote = await fetchQuoteFromAPI(category);
        setQuote(newQuote);
      } catch (error) {
        console.error('Error fetching quote:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleFavoritesView = () => {
    setShowFavorites(!showFavorites);
    if (!showFavorites && favorites.length > 0) {
      showRandomFavorite();
    }
  };

  const fetchWithTimeout = async (url, timeout = 10000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your connection');
      }
      throw error;
    }
  };

  return (
    <div className={`App ${darkMode ? 'dark' : 'light'}`}>
      <h1>💫Quote it💫</h1>
      
      <div className="controls">
        <div className="control-group">
          <label>Category: </label>
          <select 
            value={selectedCategory} 
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            {categories.map(category => (
              <option key={category.name} value={category.tag}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="favorites-controls">
        <button 
          onClick={toggleFavoritesView}
          className={showFavorites ? 'favorites-button active' : 'favorites-button'}
        >
          {showFavorites ? `Hide Favorites (${favorites.length})` : `Show Favorites (${favorites.length})`}
        </button>
        
        {showFavorites && favorites.length > 0 && (
          <button 
            onClick={showRandomFavorite}
            className="random-favorite-button"
          >
            Random Favorite
          </button>
        )}
      </div>
    
      <div className="quote-display">
        {quote && (
          <div key={quote.text} className={`quote-container ${loading ? 'loading' : 'fade-in'}`}>
            {loading && <div className="loading-overlay">Loading new quote...</div>}
            <img 
              className="fade-in" 
              src={quote.image} 
              alt={quote.author} 
              style={{ width : '120px', borderRadius: '10px'}} 
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(quote.author)}&size=150&background=gradient&color=fff`;
              }}
            />
            <div className="quote-text">
              <h2>"{quote.text}"</h2>
              <div className="author-section">
                <span>- </span>
                <a 
                  href={quote.wikipedia?.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="author-link"
                  title={quote.wikipedia?.exists ? 
                    `Learn more about ${quote.author} on Wikipedia` : 
                    `Search for ${quote.author} on Wikipedia`
                  }
                >
                  <strong>{quote.author}</strong>
                </a>
              </div>
            </div>
            
            <div className="quote-metadata">
              {quote.tags && quote.tags.length > 0 && (
                <div>
                  Tags: {quote.tags.map(tag => 
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <button 
              onClick={toggleFavorite}
              className={`favorite-button ${isQuoteFavorited() ? 'favorited' : ''}`}
              disabled={loading}
            >
              {isQuoteFavorited() ? '❤️ Favorited' : '🤍 Add to Favorites'}
            </button>
          </div>
        )}
        
        {!quote && (
          <div className="quote-container placeholder">
            <div className="placeholder-content">
              <h3>Ready to inspire yourself?</h3>
              <p>Click the button below to generate your first quote!</p>
            </div>
          </div>
        )}
        
        {showFavorites && favorites.length === 0 && (
          <div className="quote-container placeholder">
            <div className="placeholder-content">
              <h3>No favorites yet!</h3>
              <p>Start by clicking the heart on quotes you love.</p>
            </div>
          </div>
        )}
      </div>

      <button onClick={handleClick} className="generate-button" disabled={loading}>
        {loading ? '✨ Loading...' : '✨ Generate New Quote'}
      </button>

      <button 
        onClick={() => setDarkMode(!darkMode)}
        title="Toggle Theme"
        className="theme-toggle"
      >
        {darkMode ? "☀️" : "🌙"}
      </button>

      <div className="credit-tag">
        Made with ❤️ by{' '}
        <a 
          href="https://github.com/Giogioanni" 
          target="_blank" 
          rel="noopener noreferrer"
          className="github-link"
        >
          Giogioanni
        </a>
      </div>
    </div>     
  );
}

export default App
