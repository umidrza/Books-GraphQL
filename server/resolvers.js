const { GraphQLError } = require("graphql");
const jwt = require("jsonwebtoken");
const { PubSub } = require("graphql-subscriptions");

const Author = require("./models/author");
const Book = require("./models/book");
const User = require("./models/user");

const pubsub = new PubSub();
const BOOK_ADDED = "BOOK_ADDED";
let bookCache = null;

const resolvers = {
  Query: {
    bookCount: async () => Book.countDocuments(),
    authorCount: async () => Author.countDocuments(),

    allBooks: async (root, { author, genre }) => {
      const query = {};

      if (author) {
        const authorInDb = await Author.findOne({ name: author });
        query.author = authorInDb.id;
      }

      if (genre) {
        query.genres = genre;
      }

      return Book.find(query).populate("author");
    },

    allAuthors: async (root, args, context, query) => {
      const fieldsNames = query.fieldNodes[0].selectionSet.selections.map(
        (f) => f.name.value,
      );

      if (fieldsNames.includes("bookCount")) {
        bookCache = await Book.find({});
      }

      return Author.find({});
    },

    me: (root, args, context) => {
      return context.currentUser;
    },
  },

  Mutation: {
    addBook: async (
      root,
      { title, author, published, genres },
      { currentUser },
    ) => {
      if (!currentUser) {
        throw new GraphQLError("Must be signed in", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      let book = new Book({ title, published, genres });

      let authorInDb = await Author.findOne({ name: author });

      if (!authorInDb) {
        authorInDb = new Author({ name: author });
        try {
          await await authorInDb.save();
        } catch (error) {
          throw new GraphQLError("Saving author failed", {
            extensions: {
              code: "BAD_USER_INPUT",
              invalidArgs: { author },
              error,
            },
          });
        }
      }

      book.author = authorInDb.id;

      try {
        await book.save();
      } catch (error) {
        throw new GraphQLError("Saving book failed", {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: { title, published, genres },
            error: error.errors.title,
          },
        });
      }

      book = await Book.findById(book.id).populate("author");

      pubsub.publish("BOOK_ADDED", { bookAdded: book });

      return book;
    },

    editAuthor: async (root, args, context) => {
      const currentUser = context.currentUser;

      if (!currentUser) {
        throw new GraphQLError("not authenticated", {
          extensions: {
            code: "UNAUTHENTICATED",
          },
        });
      }

      try {
        const author = await Author.findOne({ name: args.name });

        if (!author) return null;

        author.born = args.setBornTo;
        await author.save();

        return author;
      } catch (error) {
        throw new GraphQLError(error.message, {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: args,
          },
        });
      }
    },

    createUser: async (root, args) => {
      try {
        const user = new User(args);
        return await user.save();
      } catch (error) {
        throw new GraphQLError(error.message, {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: args,
          },
        });
      }
    },

    login: async (root, args) => {
      const user = await User.findOne({ username: args.username });

      if (!user || args.password !== "secret") {
        throw new GraphQLError("wrong credentials", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      const userForToken = {
        username: user.username,
        id: user._id,
      };

      return {
        value: jwt.sign(userForToken, process.env.JWT_SECRET),
      };
    },
  },

  Author: {
    bookCount: async (root) => {
      if (bookCache) {
        return bookCache.filter((b) => b.author.toString() === root.id).length;
      }
      return Book.countDocuments({ author: root.id });
    },
  },

  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterableIterator(BOOK_ADDED),
    },
  },
};

module.exports = resolvers;
