import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useState } from "react";
import { useApolloClient, useSubscription } from "@apollo/client/react";
import Authors from "./components/Authors";
import Books from "./components/Books";
import NewBook from "./components/NewBook";
import LoginForm from "./components/LoginForm";
import { BOOK_ADDED } from "./queries";
import { addBookToCache } from "./utils/apolloCache";

const App = () => {
  const [token, setToken] = useState(localStorage.getItem("books-user-token"));
  const client = useApolloClient();

  useSubscription(BOOK_ADDED, {
    onData: ({ data }) => {
      const addedBook = data.data.bookAdded;
      alert(`New book added: ${addedBook.title} by ${addedBook.author.name}`);
      addBookToCache(client.cache, addedBook);
    },
  });
  
  const onLogout = () => {
    setToken(null);
    localStorage.clear();
    client.resetStore();
  };

  return (
    <Router>
      <div>
        <div>
          <Link to="/authors">
            <button>authors</button>
          </Link>
          <Link to="/books">
            <button>books</button>
          </Link>
          <Link to="/add">
            <button>add book</button>
          </Link>

          {!token && (
            <Link to="/login">
              <button>login</button>
            </Link>
          )}

          {token && <button onClick={onLogout}>logout</button>}
        </div>

        <Routes>
          <Route path="/authors" element={<Authors />} />
          <Route path="/books" element={<Books />} />
          <Route path="/add" element={<NewBook />} />
          <Route path="/login" element={<LoginForm setToken={setToken} />} />
          <Route path="*" element={<Authors />} />
        </Routes>

        <button onClick={onLogout}>logout</button>
      </div>
    </Router>
  );
};

export default App;
