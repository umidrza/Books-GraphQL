import { useQuery } from "@apollo/client/react";
import { ALL_BOOKS } from "../queries";
import { useState } from "react";

const Books = () => {
  const [genre, setGenre] = useState(null);

  const result = useQuery(ALL_BOOKS, {
    variables: { genre },
  });

  if (result.loading) {
    return <div>loading...</div>;
  }

  if (result.error) {
    return <div>Error loading books</div>;
  }

  const books = result.data.allBooks;
  const genres = [...new Set(books.flatMap((b) => b.genres))];

  return (
    <div>
      <h2>books</h2>

      <div>
        {genres.map((g) => (
          <button key={g} onClick={() => setGenre(g)}>
            {g}
          </button>
        ))}
        <button onClick={() => setGenre(null)}>all genres</button>
      </div>

      <table>
        <tbody>
          <tr>
            <th></th>
            <th>author</th>
            <th>published</th>
          </tr>
          {books.map((a) => (
            <tr key={a.id}>
              <td>{a.title}</td>
              <td>{a.author.name}</td>
              <td>{a.published}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Books;
