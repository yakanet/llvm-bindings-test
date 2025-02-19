import llvm from "llvm-bindings";
import { spawnSync } from 'node:child_process';
import { mkdir, rm, writeFile } from "node:fs/promises";
import { platform } from 'node:os'

const output = 'app'

const context = new llvm.LLVMContext();
const module = new llvm.Module(output, context);
const builder = new llvm.IRBuilder(context);
module.setSourceFileName('./index.ts')

function getAdd() {
    const returnType = builder.getInt32Ty();
    const paramTypes = [builder.getInt32Ty(), builder.getInt32Ty()];
    const functionType = llvm.FunctionType.get(returnType, paramTypes, false);
    const addFunc = llvm.Function.Create(functionType, 0/*llvm.Function.LinkageTypes.ExternalLinkage*/, 'add', module);

    const entryBB = llvm.BasicBlock.Create(context, 'entry', addFunc);
    builder.SetInsertPoint(entryBB);
    const a = addFunc.getArg(0);
    const b = addFunc.getArg(1);

    const result = builder.CreateAdd(a, b);
    builder.CreateRet(result);

    if (llvm.verifyFunction(addFunc)) {
        throw 'Verifying function failed';
    }
    return addFunc
}

const addFunc = getAdd();
function getMain() {
    const returnType = builder.getInt32Ty();
    const paramTypes: llvm.Type[] = [];
    const functionType = llvm.FunctionType.get(returnType, paramTypes, false);
    const func = llvm.Function.Create(functionType, llvm.Function.LinkageTypes.ExternalLinkage, 'main', module);

    const entryBlock = llvm.BasicBlock.Create(context, 'entry', func);
    builder.SetInsertPoint(entryBlock);

    const str = builder.CreateGlobalStringPtr("Hello, World!\n", "str");

    builder.CreateCall(getPrintf(), [str])

    const result = builder.CreateCall(addFunc, [
        llvm.ConstantInt.get(context, new llvm.APInt(32, 2, false)),
        llvm.ConstantInt.get(context, new llvm.APInt(32, 2, false))
    ]);
    builder.CreateRet(result);

    if (llvm.verifyFunction(func)) {
        throw 'Verifying function failed';
    }
}

function getPrintf() {
    return module.getOrInsertFunction('printf', llvm.FunctionType.get(
        llvm.IntegerType.getInt32Ty(context),
        [llvm.PointerType.get(llvm.Type.getInt8Ty(context), 0)],
        true
    ))
}

getMain();

if (llvm.verifyModule(module)) {
    throw 'Verifying module failed';
}
console.log(module.print());

await rm('build', { force: true, recursive: true })
await mkdir('build', { recursive: true })
llvm.WriteBitcodeToFile(module, `build/${output}.bc`)

console.log(`Writing LLVM sources (for debug purpose) to ./build/${output}.ir`)
await writeFile(`build/${output}.ll`, module.print(), { encoding: 'utf8' })

const executableExt = platform() === 'win32' ? '.exe' : '';
exec([
    'clang',
    '-o', `build/${output}${executableExt}`,
    '-O3',
    `build/${output}.bc`
])

exec([
    'clang',
    '-o', `build/${output}.unoptimized.wasm`,
    '-target', 'wasm32-unknown-unknown',
    '-nostdlib',
    //'-O3',
    '-Wl,--no-entry',
    '-Wl,--allow-undefined',
    //'-Wl,--import-memory',
    //'-Wl,--import-table',
    '-Wl,--export=main',
    '-Wl,--export=add',
    `build/${output}.bc`
])

exec([
    'wasm-opt',
    '-O3',
    '--strip',
    `build/${output}.unoptimized.wasm`,
    '-o', `build/${output}.wasm`
])

function exec(command: string[]) {
    console.log(`Executing: ${command.join(' ')}`)
    const result = spawnSync(command[0], command.splice(1))
    if (result.error) {
        throw result.error
    }
}
