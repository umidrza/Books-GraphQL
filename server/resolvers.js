const Author = require("./models/author");
const Book = require("./models/book");
const User = require("./models/user");
const { GraphQLError } = require("graphql");
const jwt = require("jsonwebtoken");
const { PubSub } = require("graphql-subscriptions");

const pubsub = new PubSub();
const BOOK_ADDED = "BOOK_ADDED";

const getAuthorBookCounts = async () => {
  const counts = await Book.aggregate([
    {
      $group: {
        _id: "$author",
        bookCount: { $sum: 1 },
      },
    },
  ]);

  return new Map(
    counts.map(({ _id, bookCount }) => [String(_id), bookCount])
  );
};

const resolvers = {
  Query: {
    bookCount: async () => Book.countDocuments(),
    authorCount: async () => Author.countDocuments(),

    allBooks: async (root, args) => {
      let filter = {};

      // filter by author
      if (args.author) {
        const author = await Author.findOne({ name: args.author });
        if (author) {
          filter.author = author._id;
        } else {
          return [];
        }
      }

      // filter by genre
      if (args.genre) {
        filter.genres = { $in: [args.genre] };
      }

      return Book.find(filter).populate("author");
    },

    allAuthors: async () => {
      const [authors, bookCounts] = await Promise.all([
        Author.find({}),
        getAuthorBookCounts(),
      ]);

      return authors.map((author) => ({
        ...author.toObject(),
        bookCount: bookCounts.get(String(author._id)) ?? 0,
      }));
    },

    me: (root, args, context) => {
      return context.currentUser;
    },
  },

  Mutation: {
    addBook: async (root, args, context) => {
      const currentUser = context.currentUser;

      if (!currentUser) {
        throw new GraphQLError("not authenticated", {
          extensions: {
            code: "UNAUTHENTICATED",
          },
        });
      }

      try {
        let author = await Author.findOne({ name: args.author });

        if (!author) {
          author = new Author({ name: args.author });
          await author.save();
        }

        const book = new Book({
          ...args,
          author: author._id,
        });

        await book.save();

        const populatedBook = await Book.findById(book._id).populate("author");

        await pubsub.publish(BOOK_ADDED, {
          bookAdded: populatedBook,
        });

        return populatedBook;
      } catch (error) {
        throw new GraphQLError(error.message, {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: args,
          },
        });
      }
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
      if (typeof root.bookCount === "number") {
        return root.bookCount;
      }

      return Book.countDocuments({ author: root._id });
    },
  },

  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterableIterator(BOOK_ADDED),
    },
  },
};

module.exports = resolvers;
