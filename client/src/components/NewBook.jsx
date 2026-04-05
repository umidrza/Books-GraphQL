import { useState } from "react";
import { ADD_BOOK } from "../queries";
import { useMutation } from "@apollo/client/react";
import { addBookToCache } from "../utils/apolloCache";

const NewBook = () => {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [published, setPublished] = useState("");
  const [genre, setGenre] = useState("");
  const [genres, setGenres] = useState([]);

  const [addBook] = useMutation(ADD_BOOK, {
    onError: (error) => {
      console.log(error.graphQLErrors);
    },
    update: (cache, response) => {
      const addedBook = response.data.addBook
      addBookToCache(cache, addedBook)
    },
  });

  const submit = async (event) => {
    event.preventDefault();

    await addBook({
      variables: {
        title,
        author,
        published: Number(published),
        genres,
      },
    });

    setTitle("");
    setAuthor("");
    setPublished("");
    setGenres([]);
    setGenre("");
  };

  const addGenre = () => {
    if (!genre.trim()) return;
    setGenres(genres.concat(genre));
    setGenre("");
  };

  return (
    <div>
      <h2>add book</h2>

      <form onSubmit={submit}>
        <div>
          title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          author
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </div>

        <div>
          published
          <input
            type="number"
            value={published}
            onChange={(e) => setPublished(e.target.value)}
          />
        </div>

        <div>
          <input
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
          />
          <button type="button" onClick={addGenre}>
            add genre
          </button>
        </div>

        <div>genres: {genres.join(" ")}</div>

        <button type="submit">create book</button>
      </form>
    </div>
  );
};

export default NewBook;
