import path from 'node:path'

/** Resolves all deterministic evoworkflow paths for a managed repository. */
export function repositoryPaths(root: string) {
  const resolvedRoot = path.resolve(root)
  const evo = path.join(resolvedRoot, '.evo')
  return {
    root: resolvedRoot,
    agents: path.join(resolvedRoot, 'AGENTS.md'),
    context: path.join(resolvedRoot, 'CONTEXT.md'),
    evo,
    config: path.join(evo, 'config.yml'),
    project: path.join(evo, 'project.md'),
    state: path.join(evo, 'state.yml'),
    work: path.join(evo, 'work'),
    activeWork: path.join(evo, 'work', 'active'),
    completedWork: path.join(evo, 'work', 'completed'),
    backlogWork: path.join(evo, 'work', 'backlog'),
    decisions: path.join(evo, 'decisions'),
    workingDecisions: path.join(evo, 'decisions', 'working'),
    currentDecisions: path.join(evo, 'decisions', 'current'),
    declinedDecisions: path.join(evo, 'decisions', 'declined'),
    changeSets: path.join(evo, 'change-sets'),
    migrations: path.join(evo, 'migrations'),
    goals: path.join(evo, 'goals'),
    activeGoals: path.join(evo, 'goals', 'active'),
    completedGoals: path.join(evo, 'goals', 'completed'),
    postmortems: path.join(evo, 'postmortems'),
  }
}
