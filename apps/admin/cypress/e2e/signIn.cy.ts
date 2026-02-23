import SignInPage from '../support/pageObjects/SignInPage';

describe('Sign In', () => {
  var data: { email: string; password: string };

  // get credentials to sign in
  before(() => {
    cy.fixture('credentials').then((credentials) => {
      data = credentials;
    });
  });

  it('should log in with email and password', () => {
    const signInPage = new SignInPage();

    cy.visit('http://localhost:3001');

    // click on sign in button in navbar
    cy.get('#nav-login-btn').click();

    // wait for page to load
    cy.wait(5000);

    // sign in
    signInPage.signIn(data.email, data.password);
  });
});
