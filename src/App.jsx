import { useState, useEffect } from 'react'
import './App.css'

const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

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
      // First try Wikipedia API
      const wikiResponse = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(author)}`, {
        headers: {
          'Accept': 'application/json',
          'Api-User-Agent': 'Quote-It/1.0 (https://giogioanni.github.io/quote-it/)'
        }
      });

      if (wikiResponse.ok) {
        const data = await wikiResponse.json();
        if (data.thumbnail && data.thumbnail.source) {
          return data.thumbnail.source;
        }
      }

      // If Wikipedia fails, try searching for public domain images
      const searchResponse = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(author)}&per_page=1`, {
        headers: {
          'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
          'Accept-Version': 'v1'
        }
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.results && searchData.results.length > 0) {
          return searchData.results[0].urls.small;
        }
      }
    } catch (error) {
      console.log('Image fetch failed:', error);
    }

    // Final fallback to UI Avatars with gradient
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(author)}&size=150&background=random&color=fff`;
  };

  //  mobile-compatible version
  const fetchQuoteFromAPI = async (category = '') => {
    const apiUrl = category 
      ? `https://api.quotable.io/random?tags=${category}`
      : 'https://api.quotable.io/random';

    try {
      console.log('Fetching quote from:', apiUrl); // Debug log

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'User-Agent': 'Quote-It/1.0 (Mobile)'
        },
        mode: 'cors',
        cache: 'no-store'
      });

      console.log('Response status:', response.status); // Debug log

      if (!response.ok) {
        throw new Error(`Quote API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Quote data received:', data); // Debug log

      // Validate the data
      if (!data.content || !data.author) {
        throw new Error('Invalid quote data received');
      }

      // Return complete quote without waiting for image/wiki data
      const quote = {
        text: data.content,
        author: data.author,
        tags: data.tags || [],
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.author)}&size=150&background=random&color=fff`,
        wikipedia: { 
          exists: true, 
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(data.author)}`
        }
      };

      // Try to enhance with image and wiki data in the background
      Promise.all([
        fetchAuthorImage(data.author),
        fetchWikipediaData(data.author)
      ]).then(([imageUrl, wikiData]) => {
        if (imageUrl) quote.image = imageUrl;
        if (wikiData) quote.wikipedia = wikiData;
      }).catch(error => {
        console.log('Enhancement failed, using basic data:', error);
      });

      return quote;
    } catch (error) {
      console.error('Quote fetch failed:', error);
      throw error;
    }
  };

  // Simplified handleClick that focuses on just getting quotes working
  const handleClick = async () => {
    setLoading(true);
    
    try {
      if (showFavorites && favorites.length > 0) {
        const randomFavorite = favorites[Math.floor(Math.random() * favorites.length)];
        setQuote(randomFavorite);
      } else {
        const newQuote = await fetchQuoteFromAPI(selectedCategory);
        setQuote(newQuote);
      }
    } catch (error) {
      console.error('Failed to generate quote:', error);
      // Don't use fallback quotes - retry the API call
      try {
        const retryQuote = await fetchQuoteFromAPI(selectedCategory);
        setQuote(retryQuote);
      } catch (retryError) {
        console.error('Retry also failed:', retryError);
        // Only now show an error to the user
        alert('Unable to load quotes. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
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
