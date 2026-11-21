# Persistence extension point

Implement the JSON state repository here using `apiConfig.dataFile`, resolved
relative to the workspace root. Create the parent directory, load once at startup,
serialize writes, and atomically replace via a temporary file. Preserve
`pet.reactionSeq` across restarts. Do not commit runtime data.

The scaffold is read-only and does not yet read or write DATA_FILE.
