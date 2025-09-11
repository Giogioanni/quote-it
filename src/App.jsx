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

  const fetchAuthorImage = async (authorName) => {
    try {
      const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(authorName)}`;
      const response = await fetch(searchUrl);
      
      if (response.ok) {
        const data = await response.json();
        if (data.thumbnail && data.thumbnail.source) {
          return data.thumbnail.source;
        }
      }
    } catch (error) {
      console.log(`No Wikipedia image found for ${authorName}`);
    }
    
    try {
      const directSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&titles=${encodeURIComponent(authorName)}&pithumbsize=150&origin=*`;
      const directResponse = await fetch(directSearchUrl);
      
      if (directResponse.ok) {
        const directData = await directResponse.json();
        const pages = directData.query?.pages;
        if (pages) {
          const pageId = Object.keys(pages)[0];
          const page = pages[pageId];
          if (page.thumbnail && page.thumbnail.source) {
            return page.thumbnail.source;
          }
        }
      }
    } catch (error) {
      console.log(`Direct Wikipedia search failed for ${authorName}`);
    }
    
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&size=150&background=gradient&color=fff&font-size=0.6&format=png`;
  };

  const fetchQuoteFromAPI = async (category = '') => {
    try {
      const url = category 
        ? `https://api.quotable.io/random?tags=${category}`
        : 'https://api.quotable.io/random';
      
      console.log('Fetching from:', url); 
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('API Response not ok:', response.status, response.statusText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Quote data received:', data); 
      return data;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  };

  const handleClick = async () => {
    setLoading(true);
    try {
      console.log('Starting quote fetch...'); // Debug log
      
      const quoteData = showFavorites && favorites.length > 0 
        ? favorites[Math.floor(Math.random() * favorites.length)]
        : await fetchQuoteFromAPI(selectedCategory);
      
      console.log('Quote data:', quoteData); // Debug log
      
      if (!quoteData) {
        throw new Error('No quote data received');
      }
      
      setQuote(quoteData);
    } catch (error) {
      console.error('Quote generation error:', error);
      // user-friendly error
      setQuote({
        text: "Unable to load quote. Please check your internet connection and try again.",
        author: "Quote it",
        image: "https://ui-avatars.com/api/?name=Quote+it&size=150&background=gradient&color=fff",
        tags: [],
        wikipedia: { exists: false, url: '#' }
      });
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
      <h1>💫 Quote it💫</h1>
      
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
