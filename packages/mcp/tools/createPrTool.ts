import { Tool } from "@modelcontextprotocol/sdk/types";
import { execSync } from "child_process";

function hasChanges(): boolean {
  const out = execSync("git status --porcelain", { encoding: "utf8" });
  return out.trim().length > 0;
}

function hasGh(): boolean {
  try {
    execSync("gh --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export const createPrTool: Tool = {
  name: "create_i18n_pr",
  description: "Create a GitHub Pull Request for i18n changes",

  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "PR title",
        default: "chore(i18n): fix translations",
      },
      body: {
        type: "string",
        description: "PR description",
        default:
          "Automated i18n fixes (missing / unused keys, structure alignment).",
      },
      branch: {
        type: "string",
        description: "Branch name",
        default: "i18n/auto-fix",
      },
    },
  },

  async run({ title, body, branch }) {
    if (!hasGh()) {
      throw new Error(
        "GitHub CLI (gh) is not installed. Please install it first."
      );
    }

    if (!hasChanges()) {
      return {
        message: "No changes detected. PR was not created.",
        created: false,
      };
    }

    execSync(`git checkout -B ${branch}`);
    execSync(`git add locales`);
    execSync(`git commit -m "${title}"`);
    execSync(`git push -u origin ${branch}`);

    execSync(`gh pr create --title "${title}" --body "${body}" --base main`);

    return {
      message: "Pull Request created successfully.",
      created: true,
      branch,
    };
  },
};
