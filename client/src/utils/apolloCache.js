export const addBookToCache = (cache, bookToAdd) => {
  cache.modify({
    fields: {
      allBooks(existingBooks = [], { args, toReference, readField }) {
        const newBookRef = toReference(bookToAdd, true)

        if (args?.genre) {
          if (!bookToAdd.genres.includes(args.genre)) {
            return existingBooks
          }
        }

        const bookExists = existingBooks.some(
          (book) => readField("id", book) === bookToAdd.id
        )

        if (bookExists) return existingBooks

        return [...existingBooks, newBookRef]
      },
    },
  })
}
