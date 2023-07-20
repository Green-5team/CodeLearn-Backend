import { ObjectId } from 'mongoose';
import { verify } from 'jsonwebtoken';
import { JwtStrategy } from 'src/user/jwt.strategy';
import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { SignUpDto, LoginDto, UpdateDto, LostDto, RenameDto, GetoneDto } from "./dto"


@Injectable()
export class UserService {
    constructor(
        @Inject(JwtStrategy) private readonly jwtStrategy: JwtStrategy,
        @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService) {}

    // async createUser(user : UserRequestDto) : Promise<UserRequestDto> {
    //     const hashedPassword = await bcrypt.hash(user.password, 10);
    //     const newUser = new this.userModel({...user, password : hashedPassword});
    //     return newUser.save();
    // }

    // async validateUser(user : UserRequestDto) : Promise<any> {
    //     const user_info = await this.userModel.findOne({email : user.email});
    //     if (!user_info || !await bcrypt.compare(user.password, user_info.password)){
    //         throw new UnauthorizedException('Invalid email or password');
    //     }
    //     return "Success";
    // }

    async signUp(signUpDto: SignUpDto): Promise<{ token: string }> {
        const { email, password } = signUpDto;
        const isUserExist = await this.userModel.exists({email: email});
        if (isUserExist) {
          throw new UnauthorizedException('duplicate email');
        }
        // const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,12}$/;
        // if (!passwordRegex.test(password)) {
        //   throw new Error('Password must be 8 to 12 characters long and include at least one letter, one number, and one special character.');
        // }
    
        const hashedPassword = await bcrypt.hash(password, 10);
        const name ="";
        const online = 0;
        const user = await this.userModel.create({
          name,
          email,
          password: hashedPassword,
          online
        });
    
        const token = this.jwtService.sign({ id: user._id });
    
        return { token };
    }

    async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userModel.findOne({ email: email });

    if (!user) {
        throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordMatched = await bcrypt.compare(password, user.password);

    if (!isPasswordMatched) {
        throw new UnauthorizedException('Invalid email or password');
    }
    await this.userModel.updateOne({email: email}, {login: 1})
    const token = this.jwtService.sign({ id: user._id });
    const name = user.name;
    const res = {name, token};
    return { name, token};
    }

    async logout(user: User){
        const mymail = user.email;
        await this.userModel.updateOne({ email: mymail }, { online: 0 })
        return {msg:`${mymail} has logout`};
    }

    async update(updateDto: UpdateDto) {
    const { email, password } = updateDto;
    
    // const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,12}$/;
    // if (!passwordRegex.test(password)) {
    //   throw new Error('Password must be 8 to 12 characters long and include at least one letter, one number, and one special character.');
    // }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.userModel.updateOne({email: email}, {password: hashedPassword})

    return {msg:"Password Changed"};
    }

    async lost(lostDto: LostDto) {
    const { email } = lostDto;
    
    const newPassword = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userModel.updateOne({email: email}, {password: hashedPassword})

    return {password: newPassword};
    }

    async rename(renameDto: RenameDto) {
    const { name, email} = renameDto;

    await this.userModel.updateOne({email: email}, {name: name})

    return {msg:`Name Changed to ${name}`};
    }

    async getAll() {
        const res = await this.userModel.find()
        return res;
    }

    async getOne(getoneDto: GetoneDto) {
    const { email } = getoneDto;
    const user = await this.userModel.findOne({ email: email });
    if(!user){
        throw new NotFoundException(`User with name ${email} not found.`)
    }
    return user;
    }

    async decodeToken(token: string): Promise<ObjectId>  {
        const user = await this.jwtService.decode(token) as { id: ObjectId };
        const id = user?.id;
        return id;
    }

    async verifyToken(token: string): Promise<void>  {
        const user = await this.jwtService.verify(token);
        console.log(user);
    }

    async saveSocketId(token: string, socketId : string): Promise<void>{
        const user = await this.decodeToken(token);
        const updatedData = { socket_id : socketId}; 
        await this.userModel.findByIdAndUpdate(user, updatedData);
    }
    
    async deleteSocketId(token: string): Promise<void>{
        const user = await this.decodeToken(token);
        const updatedData = { socket_id : null}; 
        await this.userModel.findByIdAndUpdate(user, updatedData);
    }

    async getSocketId(token: string): Promise<string>{
        const user = await this.decodeToken(token);
        const found = await this.userModel.findById(user);
        return (await found).socket_id;
    }
      
}
