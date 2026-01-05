import { execSync } from "child_process";

export function createPullRequest({
  title,
  body,
  draft,
  branch,
}: {
  title: string;
  body: string;
  draft?: boolean;
  branch: string;
}) {
  try {
    execSync(`git checkout -b ${branch}`, { stdio: "inherit" });
    execSync(`git add locales`, { stdio: "inherit" });
    execSync(`git commit -m "${title}"`, { stdio: "inherit" });

    let cmd = `gh pr create --title "${title}" --body "${body}"`;
    if (draft) cmd += " --draft";

    execSync(cmd, { stdio: "inherit" });
  } catch (e) {
    throw new Error(
      "Failed to create PR. Make sure git and gh CLI are properly set up."
    );
  }
}
