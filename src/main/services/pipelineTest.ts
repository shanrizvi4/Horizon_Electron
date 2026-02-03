import * as fs from 'fs'
import * as path from 'path'

interface TestResult {
  step: string
  passed: boolean
  message: string
}

export async function testPipeline(dataDir: string): Promise<TestResult[]> {
  const results: TestResult[] = []
  const pipelineDir = path.join(dataDir, 'pipeline')

  const steps = [
    '1_raw_frames',
    '2_analyzed',
    '3_suggestions',
    '4_scored',
    '5_deduplicated'
  ]

  console.log('\n=== PIPELINE VERIFICATION TEST ===')

  // Test 1: Check pipeline directories exist
  for (const step of steps) {
    const stepDir = path.join(pipelineDir, step)
    try {
      const stat = await fs.promises.stat(stepDir)
      const isDir = stat.isDirectory()
      results.push({
        step: `Directory: ${step}`,
        passed: isDir,
        message: isDir ? 'Directory exists' : 'Not a directory'
      })
      console.log(`✓ ${step} directory exists`)
    } catch (error) {
      results.push({
        step: `Directory: ${step}`,
        passed: false,
        message: `Directory missing: ${(error as Error).message}`
      })
      console.log(`✗ ${step} directory missing`)
    }
  }

  // Test 2: Check screenshots directory
  const screenshotsDir = path.join(dataDir, 'screenshots')
  try {
    const stat = await fs.promises.stat(screenshotsDir)
    results.push({
      step: 'Screenshots directory',
      passed: stat.isDirectory(),
      message: 'Screenshots directory exists'
    })
    console.log('✓ Screenshots directory exists')
  } catch {
    results.push({
      step: 'Screenshots directory',
      passed: false,
      message: 'Screenshots directory missing'
    })
    console.log('✗ Screenshots directory missing')
  }

  // Test 3: Check state file can be read
  const stateFile = path.join(dataDir, 'state.json')
  try {
    await fs.promises.access(stateFile, fs.constants.R_OK)
    results.push({
      step: 'State file',
      passed: true,
      message: 'State file readable'
    })
    console.log('✓ State file readable')
  } catch {
    results.push({
      step: 'State file',
      passed: true, // OK if doesn't exist yet
      message: 'State file not yet created (will be created on first save)'
    })
    console.log('○ State file not yet created')
  }

  // Test 4: Verify write permissions
  const testFile = path.join(pipelineDir, '.write_test')
  try {
    await fs.promises.writeFile(testFile, 'test')
    await fs.promises.unlink(testFile)
    results.push({
      step: 'Write permissions',
      passed: true,
      message: 'Write permissions verified'
    })
    console.log('✓ Write permissions verified')
  } catch (error) {
    results.push({
      step: 'Write permissions',
      passed: false,
      message: `Cannot write to pipeline directory: ${(error as Error).message}`
    })
    console.log('✗ Write permissions failed')
  }

  console.log('=================================\n')

  const passed = results.filter(r => r.passed).length
  const total = results.length
  console.log(`Pipeline test: ${passed}/${total} checks passed`)

  return results
}
