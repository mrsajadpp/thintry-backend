# Backend README

This README provides essential information about the backend project's dependencies and how to get started with it.

## Table of Contents

- [Dependencies](#dependencies)
- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Dependencies

The backend project relies on several Node.js packages and libraries. Here is a list of the main dependencies along with their versions:

- **axios**: "^1.5.0"
- **bad-words**: "^3.0.4"
- **bcrypt**: "^5.1.1"
- **body-parser**: "^1.20.2"
- **compression**: "^1.7.4"
- **cookie-session**: "^2.0.0"
- **cors**: "^2.8.5"
- **dotenv**: "^16.3.1"
- **express**: "^4.18.2"
- **express-fileupload**: "^1.4.0"
- **fs**: "^0.0.1-security"
- **mongodb**: "^4.17.1"
- **multer**: "^1.4.5-lts.1"
- **node-schedule**: "^2.1.1"
- **nodemailer**: "^6.9.4"
- **nodemon**: "^3.0.1"
- **path**: "^0.12.7"
- **profanity-hindi**: "^1.1.0"
- **sanitize-html**: "^2.11.0"

## Installation

To set up the backend project and its dependencies, follow these steps:

1. **Clone the Repository**: Clone this repository to your local machine using Git.

   ```bash
   git clone <repository-url>
   ```

2. **Install Node.js**: Ensure you have Node.js installed on your machine. You can download it from [nodejs.org](https://nodejs.org/).

3. **Install Dependencies**: Navigate to the project directory and run the following command to install all required dependencies:

   ```bash
   npm install
   ```

4. **Environment Variables**: Create a `.env` file in the project root directory and add any necessary environment variables. You may refer to the provided `dotenv` package for managing these variables.

## Usage

To run the backend server, execute the following command:

```bash
npm start
```

The server should now be running and accessible at the specified port (usually port 3000 by default). You can configure the port and other settings in the `index.js` file or via environment variables.

## Contributing

If you would like to contribute to this project, please follow these guidelines:

1. Fork the repository.
2. Create a new branch for your feature or bugfix: `git checkout -b feature-name`.
3. Commit your changes: `git commit -m "Description of your changes."`.
4. Push to your branch: `git push origin feature-name`.
5. Open a Pull Request to the `main` branch of this repository.

## License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.
