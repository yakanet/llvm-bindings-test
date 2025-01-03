import llvm from "llvm-bindings";
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from "node:fs";


rmSync('build', { force: true })
mkdirSync('build', { recursive: true })

const output = 'toto'

const context = new llvm.LLVMContext();
const module = new llvm.Module(output, context);
const builder = new llvm.IRBuilder(context);
//module.setSourceFileName('index.ts')

let addFunc: llvm.Function;
{
    const returnType = builder.getInt32Ty();
    const paramTypes = [builder.getInt32Ty(), builder.getInt32Ty()];
    const functionType = llvm.FunctionType.get(returnType, paramTypes, false);
    addFunc = llvm.Function.Create(functionType, llvm.Function.LinkageTypes.ExternalLinkage, 'add', module);

    const entryBB = llvm.BasicBlock.Create(context, 'entry', addFunc);
    builder.SetInsertPoint(entryBB);
    const a = addFunc.getArg(0);
    const b = addFunc.getArg(1);

    const result = builder.CreateAdd(a, b);
    builder.CreateRet(result);

    if (llvm.verifyFunction(addFunc)) {
        throw 'Verifying function failed';
    }
}


{
    const returnType = builder.getInt32Ty();
    const paramTypes: llvm.Type[] = [];
    const functionType = llvm.FunctionType.get(returnType, paramTypes, false);
    const func = llvm.Function.Create(functionType, llvm.Function.LinkageTypes.ExternalLinkage, 'main', module);

    const entryBlock = llvm.BasicBlock.Create(context, 'entry', func);
    builder.SetInsertPoint(entryBlock);

    const result = llvm.ConstantInt.get(context, new llvm.APInt(32, 2, false));
    builder.CreateRet(result);

    if (llvm.verifyFunction(func)) {
        throw 'Verifying function failed';
    }
}

if (llvm.verifyModule(module)) {
    throw 'Verifying module failed';
}
console.log(module.print());
llvm.WriteBitcodeToFile(module, `build/${output}.ll`)

console.log(`Compiling`)
exec([
    'clang',
    '-o', `build/${output}.exe`,
    `build/${output}.ll`
])

exec([
    'clang',
    '-o', `build/${output}.wasm`,
    '-target', 'wasm32',
    '-nostdlib',
    '-Wl,--no-entry',
    '-Wl,--export-all',
    `build/${output}.ll`
])

writeFileSync(`build/${output}.ir`, module.print(), { encoding: 'utf8' })

function exec(command: string[]) {
    console.log(`Executing: ${command.join(' ')}`)
    const result = spawnSync(command[0], command.splice(1))
    if (result.error) {
        throw result.error
    }
}
