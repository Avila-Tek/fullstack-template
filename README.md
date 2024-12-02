# Fullstack Template [v2.0.0]

> Hola a todos, espero que estén bien mientras leen este documento. Esta es la última versión (v2.0.0) del fullstack template de Avila Tek, en esta ocasión hemos construido una versión que se adapta mejor a nuestra forma de trabajo. Esperamos que facilite tareas y que deje las bases de nuestra arquitectura tecnológica.
>
> Con cariño, José

## Getting started

This might sound obvious, but you need to have `node` and `npm` installed. We recommend using [nvm](https://github.com/nvm-sh/nvm) for the installation. If so, you just need to run the following command:

```shell
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

Then restart (close and reopen) the terminal, and then run `nvm install --lts`

This is important because it will install the _Long Term Support_ version of Node, which is currently `v22.10.0`

## Repo structure

This repo is a [turborepo](https://turbo.build/repo) itself. But it isn't like the turbo repo you will use for coding. What we have here is a _command line interface (CLI)_ that acts like a little helper for you to clone the actual structure of the project that you will be using.

So in this repo you will have the following structure:

```shell
.
├── CHANGELOG.md
├── README.md
├── examples
│   ├── README.md
│   ├── with-graphql-mongoose
│   │   ├── README.md
│   │   ├── apps
│   │   │   ├── admin
│   │   │   │   ├── Dockerfile
│   │   │   │   ├── README.md
│   │   │   │   ├── jest.config.ts
│   │   │   │   ├── jest.setup.ts
│   │   │   │   ├── next.config.mjs
│   │   │   │   ├── package.json
│   │   │   │   ├── postcss.config.mjs
│   │   │   │   ├── public
│   │   │   │   ├── sentry.client.config.ts
│   │   │   │   ├── sentry.edge.config.ts
│   │   │   │   ├── sentry.server.config.ts
│   │   │   │   ├── src
│   │   │   │   ├── tailwind.config.ts
│   │   │   │   └── tsconfig.json
│   │   │   ├── api
│   │   │   │   ├── Dockerfile
│   │   │   │   ├── package.json
│   │   │   │   ├── src
│   │   │   │   ├── tsconfig.json
│   │   │   │   └── tsup.config.ts
│   │   │   └── client
│   │   │       ├── Dockerfile
│   │   │       ├── README.md
│   │   │       ├── jest.config.ts
│   │   │       ├── jest.setup.ts
│   │   │       ├── next.config.mjs
│   │   │       ├── package.json
│   │   │       ├── postcss.config.mjs
│   │   │       ├── public
│   │   │       ├── sentry.client.config.ts
│   │   │       ├── sentry.edge.config.ts
│   │   │       ├── sentry.server.config.ts
│   │   │       ├── src
│   │   │       ├── tailwind.config.ts
│   │   │       └── tsconfig.json
│   │   ├── biome.json
│   │   ├── docker-compose.yml
│   │   ├── package-lock.json
│   │   ├── package.json
│   │   ├── packages
│   │   │   ├── typescript-config
│   │   │   │   ├── api.json
│   │   │   │   ├── base.json
│   │   │   │   ├── nextjs.json
│   │   │   │   ├── package.json
│   │   │   │   └── react-library.json
│   │   │   └── ui
│   │   │       ├── package.json
│   │   │       ├── src
│   │   │       ├── tsconfig.json
│   │   │       └── turbo
│   │   └── turbo.json
│   ├── with-graphql-prisma
│   │   ├── README.md
│   │   ├── apps
│   │   │   ├── admin
│   │   │   │   ├── Dockerfile
│   │   │   │   ├── README.md
│   │   │   │   ├── jest.config.ts
│   │   │   │   ├── jest.setup.ts
│   │   │   │   ├── next.config.mjs
│   │   │   │   ├── package.json
│   │   │   │   ├── postcss.config.mjs
│   │   │   │   ├── public
│   │   │   │   ├── sentry.client.config.ts
│   │   │   │   ├── sentry.edge.config.ts
│   │   │   │   ├── sentry.server.config.ts
│   │   │   │   ├── src
│   │   │   │   ├── tailwind.config.ts
│   │   │   │   └── tsconfig.json
│   │   │   ├── api
│   │   │   │   ├── Dockerfile
│   │   │   │   ├── package.json
│   │   │   │   ├── prisma
│   │   │   │   ├── src
│   │   │   │   ├── tsconfig.json
│   │   │   │   └── tsup.config.ts
│   │   │   └── client
│   │   │       ├── Dockerfile
│   │   │       ├── README.md
│   │   │       ├── jest.config.ts
│   │   │       ├── jest.setup.ts
│   │   │       ├── next.config.mjs
│   │   │       ├── package.json
│   │   │       ├── postcss.config.mjs
│   │   │       ├── public
│   │   │       ├── sentry.client.config.ts
│   │   │       ├── sentry.edge.config.ts
│   │   │       ├── sentry.server.config.ts
│   │   │       ├── src
│   │   │       ├── tailwind.config.ts
│   │   │       └── tsconfig.json
│   │   ├── biome.json
│   │   ├── docker-compose.yml
│   │   ├── package-lock.json
│   │   ├── package.json
│   │   ├── packages
│   │   │   ├── typescript-config
│   │   │   │   ├── api.json
│   │   │   │   ├── base.json
│   │   │   │   ├── nextjs.json
│   │   │   │   ├── package.json
│   │   │   │   └── react-library.json
│   │   │   └── ui
│   │   │       ├── package.json
│   │   │       ├── src
│   │   │       ├── tsconfig.json
│   │   │       └── turbo
│   │   └── turbo.json
│   ├── with-restful-mongoose
│   │   ├── README.md
│   │   ├── apps
│   │   │   ├── admin
│   │   │   │   ├── Dockerfile
│   │   │   │   ├── README.md
│   │   │   │   ├── jest.config.ts
│   │   │   │   ├── jest.polyfills.ts
│   │   │   │   ├── jest.setup.ts
│   │   │   │   ├── next.config.mjs
│   │   │   │   ├── package.json
│   │   │   │   ├── postcss.config.mjs
│   │   │   │   ├── public
│   │   │   │   ├── src
│   │   │   │   ├── tailwind.config.ts
│   │   │   │   └── tsconfig.json
│   │   │   ├── api
│   │   │   │   ├── Dockerfile
│   │   │   │   ├── package.json
│   │   │   │   ├── src
│   │   │   │   ├── tsconfig.json
│   │   │   │   └── tsup.config.ts
│   │   │   └── client
│   │   │       ├── Dockerfile
│   │   │       ├── README.md
│   │   │       ├── next.config.mjs
│   │   │       ├── package.json
│   │   │       ├── postcss.config.mjs
│   │   │       ├── public
│   │   │       ├── src
│   │   │       ├── tailwind.config.ts
│   │   │       └── tsconfig.json
│   │   ├── biome.json
│   │   ├── docker-compose.yml
│   │   ├── package-lock.json
│   │   ├── package.json
│   │   ├── packages
│   │   │   ├── typescript-config
│   │   │   │   ├── api.json
│   │   │   │   ├── base.json
│   │   │   │   ├── nextjs.json
│   │   │   │   ├── package.json
│   │   │   │   └── react-library.json
│   │   │   └── ui
│   │   │       ├── package.json
│   │   │       ├── src
│   │   │       ├── tsconfig.json
│   │   │       └── turbo
│   │   └── turbo.json
│   └── with-restful-prisma
│       ├── README.md
│       ├── apps
│       │   ├── admin
│       │   │   ├── Dockerfile
│       │   │   ├── README.md
│       │   │   ├── next.config.mjs
│       │   │   ├── package.json
│       │   │   ├── postcss.config.mjs
│       │   │   ├── public
│       │   │   ├── src
│       │   │   ├── tailwind.config.ts
│       │   │   └── tsconfig.json
│       │   ├── api
│       │   │   ├── Dockerfile
│       │   │   ├── package.json
│       │   │   ├── prisma
│       │   │   ├── src
│       │   │   ├── tsconfig.json
│       │   │   └── tsup.config.ts
│       │   └── client
│       │       ├── Dockerfile
│       │       ├── README.md
│       │       ├── next.config.mjs
│       │       ├── package.json
│       │       ├── postcss.config.mjs
│       │       ├── public
│       │       ├── src
│       │       ├── tailwind.config.ts
│       │       └── tsconfig.json
│       ├── biome.json
│       ├── docker-compose.yml
│       ├── package-lock.json
│       ├── package.json
│       ├── packages
│       │   ├── typescript-config
│       │   │   ├── api.json
│       │   │   ├── base.json
│       │   │   ├── nextjs.json
│       │   │   ├── package.json
│       │   │   └── react-library.json
│       │   └── ui
│       │       ├── package.json
│       │       ├── src
│       │       ├── tsconfig.json
│       │       └── turbo
│       └── turbo.json
└── packages
    └── create-avilatek
        └── README.md
```

You might notice that we have a folder called `examples` that contains (as of today, 4) project structures, all named `with-[restful/graphql]-[mongoose/prisma]`. The CLI should clone any of the project structures based on the parameters that were configured.

But let's take a deep look at the projects themselves.

### Project Structure

Let's take, for example, the `with-restful-prisma` example. The structure is the following:

```shell
.
├── README.md
├── apps
│   ├── admin
│   │   ├── Dockerfile
│   │   ├── README.md
│   │   ├── next.config.mjs
│   │   ├── package.json
│   │   ├── postcss.config.mjs
│   │   ├── public
│   │   │   ├── file-text.svg
│   │   │   ├── globe.svg
│   │   │   ├── next.svg
│   │   │   ├── vercel.svg
│   │   │   └── window.svg
│   │   ├── src
│   │   │   ├── app
│   │   │   │   ├── favicon.ico
│   │   │   │   ├── fonts
│   │   │   │   ├── globals.css
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.module.css
│   │   │   │   └── page.tsx
│   │   │   └── context
│   │   │       └── react-query.tsx
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   ├── api
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── prisma
│   │   │   ├── dev.db
│   │   │   ├── dev.db-journal
│   │   │   ├── migrations
│   │   │   │   ├── 20240819155219_init
│   │   │   │   └── migration_lock.toml
│   │   │   └── schema.prisma
│   │   ├── src
│   │   │   ├── app.ts
│   │   │   ├── index.ts
│   │   │   ├── instrument.ts
│   │   │   ├── plugins
│   │   │   │   └── prisma.ts
│   │   │   └── server.ts
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   └── client
│       ├── Dockerfile
│       ├── README.md
│       ├── next.config.mjs
│       ├── package.json
│       ├── postcss.config.mjs
│       ├── public
│       │   ├── file-text.svg
│       │   ├── globe.svg
│       │   ├── next.svg
│       │   ├── vercel.svg
│       │   └── window.svg
│       ├── src
│       │   ├── app
│       │   │   ├── favicon.ico
│       │   │   ├── fonts
│       │   │   ├── globals.css
│       │   │   ├── layout.tsx
│       │   │   ├── page.module.css
│       │   │   └── page.tsx
│       │   └── context
│       │       └── react-query.tsx
│       ├── tailwind.config.ts
│       └── tsconfig.json
├── biome.json
├── docker-compose.yml
├── package-lock.json
├── package.json
├── packages
│   ├── typescript-config
│   │   ├── api.json
│   │   ├── base.json
│   │   ├── nextjs.json
│   │   ├── package.json
│   │   └── react-library.json
│   └── ui
│       ├── package.json
│       ├── src
│       │   ├── button.tsx
│       │   ├── card.tsx
│       │   └── code.tsx
│       ├── tsconfig.json
│       └── turbo
│           └── generators
│               ├── config.ts
│               └── templates
└── turbo.json
```

You are seeing a typical turborepo example. We have made some customizations to help you out with the initial setup. That is why you have 3 apps:

1. admin
2. api
3. client

The _admin_ and _client_ apps are [Next.js](https://nextjs.org/docs) apps currently running version 14 and configured to use the `appRouter` (the React Server Components router).

The _api_ app is a [Fastify v4](https://fastify.dev/docs/v4.28.x/) server. Based on the selected communication protocol, it can be run as a GraphQL or a REST API. Also, depending on the selected database, it could be using [Mongoose](https://mongoosejs.com/) or [Prisma](https://prisma.io).

On the other hand, the `packages` folder contains the shared logic or UI between multiple parts of the project. The process for determining what should be in packages and what doesn't belong there is pretty simple:

1. Is the UI component an atom?
   1. If so, put it in `@package/UI`
   2. If not, ask if the component is used in both _client_ and _admin_
      1. If so, put it in `@package/UI`
      2. If not, put it in the _client/admin_ UI folder
2. Ask if _schema/dto/models_ could be used in any of _client_, _admin_, or _api_?
   1. If so, put it in `@package/models`
   2. If not, put it in the _schemas/dto/models_ folder of _client/admin/api_
3. Ask if a function can or will be reused in any of _client_, _admin_, or _api_?
   1. If so, put it in `@package/services` or `@packages/utils`
   2. If not, put it in the _services/utils_ folder of _client/admin/api_

See the refactoring section for more on this topic.

With this, I believe you are more than ready to start coding, but there is an entire section dedicated to a deeper explanation of each _app_ structure.

## Coding Workflow

So you will be spending most of your time coding in [VSCode](https://code.visualstudio.com), [Zed](https://zed.dev), or any other code editor. As of today, we highly recommend using _VSCode_, but we might change our recommendation soon 👀.

You will be using [GitHub](https://github.com) and [Lark](https://www.larksuite.com) for chatting and issue tracking.

> 💡 We have developmented our unique workflow for Git; the idea is pretty simple.

So every project in Avila Tek has a group of high-level features called **epics**. An _epic_ should have multiple features and requirements called **user stories (US or HU)**, and a _US_ could have one or more **tasks**. All _US or HU_ are grouped into two-week **sprints**. So when a _sprint_ starts, every dev will have a workload assigned.

Ready? Here's how we make features in Avila Tek; it's pretty simple.

### Steps

1. We select a _user story_ that doesn't have a blocker and go to GitHub to create an issue for it.
2. Then we go to the local repository and create a branch using that same ID
   1. e.g., `feat/estei-0001`, `fix/clabe-0231`, `chore/kaizen-3401`
3. Then make a simple change (like creating a new file) and commit that change
   1. Use this message: `chore(admin/client/api): starting chore/kaizen-3401` (adjust accordingly)
4. Then immediately push the new branch to GitHub
5. Start coding as you normally would, commit often, and try to make atomic changes within each commit
   1. Use [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) for your changes
6. When you finish your code, go to GitHub and create a new _pull request (PR)_ against the branch
   1. Depending on the strategy of the project, _development_ or _main_
7. Select a _code reviewer_ (which is often the tech lead) and then create the PR
   1. Use a _conventional commit_ message as the title of your _PR_
   2. Add a [closing word](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue) to link the _PR_ to the _issue_
8. The _reviewer_ will check your code and make comments if necessary, then will ask you for changes (again if necessary)
9. If changes are needed, go back to that branch, make the changes, and push them back to the same
10. If everything is OK, your changes will be merged to the branch, and the cycle will start over again
    1. The reviewer must close the PR and the issue, and delete the branch
    2. Please only keep active branches (stale or older than a month should be deleted)

## Our code philosofy

We like simple and straightforward solutions. We believe that if we invest enough time in thinking through the problem in detail and simplifying our solution as much as possible, the code we produce is simple, reducing the potential for errors and increasing maintainability.

For this reason, it is important to us that all our engineers take the necessary time to think about problems and their solutions, share possible solutions with their colleagues, and design the most robust solution possible. Experience has taught us that the more we think about solutions and express their pros and cons, the better we are able to program an excellent solution expressed in simple and easy-to-maintain code.

To ensure a solution is robust, we like to consider some of the following things:

1. All functionalities should be described through _User Stories (US)_
2. All functionalities should be able to be activated or deactivated using _feature flags_
3. All functionalities should have their respective migrations (and/or seeds)
4. All functionalities should have at least two unit tests that validate the base case of their interface
5. All refactors should be testable against the same set of tests as the original functionality
6. All functionalities that involve integrations with third parties should be documented
   1. That is, all new third-party integrations that are made should be added to the relevant documentation
7. As much as possible, all functionalities should measure the events that occur in the product

## Branching strategy

This Git branching strategy is designed to:

- Support scheduled releases, while we work on daily releases
- Align with three deployment environments.
- Facilitate tight integration with project management for issue tracking.
- Enhance collaboration and code quality via mandatory code reviews and CI/CD integration.

### Branching Model Overview

1. **Main Branches**:

   - **`main`**: Reflects the production-ready state of the code. Only stable, tested code is merged here.
   - **`staging`**: Reflects the ready-to-production state of the code. Only stable, tested code is merged here.
   - **`development`**: Integrates all completed features for the next release. Serves as the base for the staging environment.

2. **Supporting Branches**:
   - **Feature Branches**: Used by developers to work on new features or enhancements.
   - **Hotfix Branches**: For urgent fixes that need to be applied to production.

#### Supporting Branches

- **Feature Branches** (`<task-id>`):

  - **Purpose**: developers use these to work on individual features or tasks.
  - **Naming Convention**: Include the Task ID.
    - Example: `SOC-001`
  - **Creation**: Branch off from `development`.
  - **Integration**: Merge back into `development` after code review and CI checks.

- **Hotfix Branches** (`hotfix/<task-id>`):
  - **Purpose**: For critical fixes that need immediate deployment to production.
  - **Creation**: Branch off from `main`.
  - **Integration**: Merge into both `main` and `development` to ensure the fix is included in future releases.
  - **Deployment**: Upon merging into `main`, automatically deployed to production.

### Workflow Steps

1. **Feature development**:

   - Developer creates a feature branch from `development`.
   - Work is committed to the feature branch.
   - Upon completion, a pull request is created to merge into `development`.
   - Team lead reviews the code.
   - CI/CD runs automated tests.
   - After approval and successful tests, merge into `development`.

2. **Release Preparation**:

   - At the end of the sprint (every 15 days), create a PR from `development` to `staging`.
   - Perform final testing and make any necessary fixes.
   - Update documentation and version numbers.
   - Tag the `staging` branch with the release version release candidate (`v1.0.0-rc.0`).

3. **Hotfixes**:
   - Create a hotfix branch from `main`.
   - Implement the fix.
   - Create a pull request to merge into `main`, `staging` and `development`.
   - Team lead reviews the code.
   - After approval and CI/CD checks, merge into both branches.
   - Deploy to production upon merging into `main`.

---

<!-- ### Integration with Linear

- **Automation**:

  - When a branch is created with a Linear issue ID, it links the branch to the issue.
  - GitHub events (e.g., opening a pull request, merging) automatically update the issue status in Linear.
  - Closing a pull request transitions the Linear issue to "Done."

- **Best Practices**:
  - Always include the Linear issue ID in commit messages and pull requests.
    - Example: `Implement new search feature [LINEAR-1023]` -->

---

### CI/CD Pipeline with DroneCI

- **Automated Testing**:

  - Triggered on pull request creation and updates.
  - Runs unit tests and integration tests.
  - Results must pass before merging.

- **Deployment**:
  - **development Environment**:
    - Feature branches can be optionally deployed here for testing.
  - **Staging Environment**:
    - `staging` branch is automatically deployed upon updates.
  - **Production Environment**:
    - `main` branch is deployed after merging release branches or hotfixes.

---

### Code Review Process

- **Pull Requests**:

  - Required for merging any branch.
  - Must be reviewed and approved by the team lead.
  - Review focuses on code quality, adherence to standards, and completeness.

- **Merge Strategy**:
  - Use **merge commits** to maintain a complete history.
  - Avoid rebasing to keep the process simple for junior developers.
  - Resolve conflicts locally, guided by the team lead.

---

### **Release Management**

- **Versioning**:

  - Adopt [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`
    - **MAJOR**: Incompatible API changes.
    - **MINOR**: Backward-compatible functionality.
    - **PATCH**: Backward-compatible bug fixes.

- **Tagging**:
  - Tag the `main` branch upon merging a release branch.
    - Example: `v1.2.0`
  - Tags facilitate tracking of releases and rollback if necessary.
