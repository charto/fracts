System.built(1,11,[{
	name: "bigfloat",
	version: "0.1.1",
	root: "node_modules/bigfloat",
	main: "dist/cjs/index.js",
	files: [
		[
			/* bigfloat: 0 */
			"dist/cjs/index.js", ["cjs","js"], {}, (function(GLOBAL, __dirname, __filename, exports, global, module, process, require) {
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

// This file is part of bigfloat, copyright (c) 2015- BusFaster Ltd.
// Released under the MIT license, see LICENSE.
/** Base for calculations, the bigger the better but must fit in 32 bits. */
var limbSize32 = Math.pow(2, 32);
var limbInv32 = Math.pow(2, -32);
var limbsPerDigit32 = Math.log(10) / (32 * Math.log(2));
/** Create a string with the given number of zero digits. */
function zeroes(count) {
    return (new Array(count + 1).join('0'));
}
var BaseInfo32 = /** @class */ (function () {
    function BaseInfo32(base) {
        this.base = base;
        /** Average number of digits per limb. */
        this.limbDigitsExact = Math.log(limbSize32) / Math.log(this.base);
        /** Number of entire digits per limb. */
        this.limbDigits = ~~this.limbDigitsExact;
        /** Maximum power of base that fits in a limb. */
        this.limbBase = Math.pow(this.base, this.limbDigits);
        /** String of zeroes for padding an empty limb. */
        this.pad = zeroes(this.limbDigits);
    }
    BaseInfo32.init = function (base) {
        return (BaseInfo32.baseTbl[base] || (BaseInfo32.baseTbl[base] = new BaseInfo32(base)));
    };
    BaseInfo32.baseTbl = {};
    return BaseInfo32;
}());

// This file is part of bigfloat, copyright (c) 2015- BusFaster Ltd.
/** Remove leading and trailing insignificant zero digits. */
function trimNumber(str) {
    return (str
        .replace(/^(-?)0+([1-9a-z]|0(\.|$))/, '$1$2')
        .replace(/(\.|(\.[0-9a-z]*[1-9a-z]))0+$/, '$2'));
}
/** Output EXACT value of an IEEE 754 double in any base supported by Number.toString.
     * Exponent must be between -2 and 61, and last 3 bits of mantissa must be 0.
    * Useful for debugging. */
function numberToString(dbl, base) {
    if (base === void 0) { base = 10; }
    var _a = BaseInfo32.init(base), pad = _a.pad, limbBase = _a.limbBase;
    var sign = '';
    var out = '';
    var limb;
    var limbStr;
    if (isNaN(dbl))
        return ('NaN');
    // For negative numbers, output sign and get absolute value.
    if (dbl < 0) {
        sign = '-';
        dbl = -dbl;
    }
    if (!isFinite(dbl))
        return (sign + 'Inf');
    if (dbl < 1) {
        out += '0';
    }
    else {
        var iPart = Math.floor(dbl);
        dbl -= iPart;
        while (iPart) {
            // Extract groups of digits starting from the least significant.
            limb = iPart % limbBase;
            iPart = (iPart - limb) / limbBase;
            limbStr = limb.toString(base);
            // Prepend digits to result.
            out = limbStr + out;
            // If more limbs remain, pad with zeroes to group length.
            if (iPart)
                out = pad.substr(limbStr.length) + out;
        }
    }
    // Is there a fractional part remaining?
    if (dbl > 0) {
        out += '.';
        if (limbBase != limbSize32) {
            limbBase = base;
            pad = '';
        }
        while (dbl) {
            // Extract groups of digits starting from the most significant.
            dbl *= limbBase;
            limb = dbl >>> 0;
            dbl -= limb;
            limbStr = limb.toString(base);
            // Append digits to result and pad with zeroes to group length.
            out += pad.substr(limbStr.length) + limbStr;
        }
    }
    // Remove trailing zeroes.
    return (sign + out.replace(/(\.[0-9a-z]*[1-9a-z])0+$/, '$1'));
}

// This file is part of bigfloat, copyright (c) 2015- BusFaster Ltd.
var BigFloat32 = /** @class */ (function () {
    function BigFloat32(value, base) {
        /** List of digits in base 2^32, least significant first. */
        this.limbList = [];
        value ? this.setValue(value, base) : this.setZero();
    }
    BigFloat32.prototype.clone = function () {
        return (new BigFloat32().setBig(this));
    };
    BigFloat32.prototype.setZero = function () {
        this.sign = 1;
        this.fractionLen = 0;
        this.len = 0;
        return (this);
    };
    BigFloat32.prototype.setValue = function (other, base) {
        if (typeof (other) == 'number') {
            return (this.setNumber(other));
        }
        if (other instanceof BigFloat32) {
            return (this.setBig(other));
        }
        return (this.setString(other.toString(), base || 10));
    };
    BigFloat32.prototype.setBig = function (other) {
        var len = other.len;
        this.sign = other.sign;
        this.fractionLen = other.fractionLen;
        this.len = len;
        for (var pos = 0; pos < len; ++pos) {
            this.limbList[pos] = other.limbList[pos];
        }
        return (this);
    };
    /** Set value from a floating point number (probably IEEE 754 double). */
    BigFloat32.prototype.setNumber = function (value) {
        if (value < 0) {
            value = -value;
            this.sign = -1;
        }
        else {
            this.sign = 1;
        }
        var iPart = Math.floor(value);
        var fPart = value - iPart;
        var fractionLen = 0;
        var limbList = this.limbList;
        var limb;
        var len = 0;
        // Handle fractional part.
        while (fPart) {
            // Extract limbs starting from the most significant.
            fPart *= limbSize32;
            limb = fPart >>> 0;
            fPart -= limb;
            // Append limb to value (limbs are reversed later).
            limbList[len++] = limb;
            ++fractionLen;
        }
        // Reverse array from 0 to len.
        var pos = 0;
        while (--len > pos) {
            limb = limbList[pos];
            limbList[pos++] = limbList[len];
            limbList[len] = limb;
        }
        len += pos + 1;
        // Handle integer part.
        while (iPart) {
            // Extract limbs starting from the least significant.
            limb = iPart % limbSize32; // Could also be iPart >>> 0
            iPart = (iPart - limb) / limbSize32;
            // Append limb to value.
            limbList[len++] = limb;
        }
        this.limbList = limbList;
        this.fractionLen = fractionLen;
        this.len = len;
        return (this);
    };
    BigFloat32.prototype.parseFraction = function (value, base, start, offset, limbBase, limbDigits) {
        var limbList = this.limbList;
        var pos = value.length;
        // Set limbs to zero, because divInt uses them as input.
        var limbNum = offset - 1;
        while (limbNum) {
            limbList[--limbNum] = 0;
        }
        // Read initial digits so their count becomes divisible by limbDigits.
        var posNext = pos - ((pos - start + limbDigits - 1) % limbDigits + 1);
        limbList[offset - 1] = parseInt(value.substr(posNext, pos - posNext), base);
        this.divInt(Math.pow(base, pos - posNext), offset);
        pos = posNext;
        // Read rest of the digits in limbDigits sized chunks.
        while (pos > start) {
            pos -= limbDigits;
            limbList[offset - 1] = parseInt(value.substr(pos, limbDigits), base);
            // Divide by maximum power of base that fits in a limb.
            this.divInt(limbBase, offset);
        }
    };
    BigFloat32.prototype.setString = function (value, base) {
        var _a = BaseInfo32.init(base), limbBase = _a.limbBase, limbDigits = _a.limbDigits, limbDigitsExact = _a.limbDigitsExact;
        var limbList = this.limbList;
        var pos = -1;
        var c;
        this.sign = 1;
        // Handle leading signs and zeroes.
        while (1) {
            c = value.charAt(++pos);
            switch (c) {
                case '-':
                    this.sign = -1;
                case '+':
                case '0':
                    continue;
            }
            break;
        }
        var posDot = (value.indexOf('.', pos) + 1 || value.length + 1) - 1;
        // Handle fractional part.
        if (posDot < value.length - 1) {
            // Reserve enough limbs to contain digits in fractional part.
            var len = ~~((value.length - posDot - 1) / limbDigitsExact) + 1;
            this.parseFraction(value, base, posDot + 1, len + 1, limbBase, limbDigits);
            this.fractionLen = len;
            this.len = len;
            // Remove trailing zeroes.
            this.trimLeast();
        }
        else {
            this.fractionLen = 0;
            this.len = 0;
        }
        var offset = this.fractionLen;
        // Handle integer part.
        if (posDot > pos) {
            // Read initial digits so their count becomes divisible by limbDigits.
            var posNext = pos + (posDot - pos + limbDigits - 1) % limbDigits + 1;
            ++this.len;
            limbList[offset] = parseInt(value.substr(pos, posNext - pos), base);
            pos = posNext;
            // Read rest of the digits in limbDigits sized chunks.
            while (pos < posDot) {
                // Multiply by maximum power of base that fits in a limb.
                if (this.mulInt(limbBase, limbList, offset, offset, 0))
                    ++this.len;
                // Add latest limb.
                limbList[offset] += parseInt(value.substr(pos, limbDigits), base);
                pos += limbDigits;
            }
        }
        return (this);
    };
    /** Trim zero limbs from most significant end. */
    BigFloat32.prototype.trimMost = function () {
        var limbList = this.limbList;
        var fractionLen = this.fractionLen;
        var len = this.len;
        while (len > fractionLen && !limbList[len - 1])
            --len;
        this.len = len;
    };
    /** Trim zero limbs from least significant end. */
    BigFloat32.prototype.trimLeast = function () {
        var limbList = this.limbList;
        var len = this.fractionLen;
        var pos = 0;
        while (pos < len && !limbList[pos])
            ++pos;
        if (pos)
            this.truncate(len - pos);
    };
    /** Multiply by an integer and write output limbs to another list. */
    BigFloat32.prototype.mulInt = function (factor, dstLimbList, srcPos, dstPos, overwriteMask) {
        if (!factor)
            return (0);
        var limbList = this.limbList;
        var limbCount = this.len;
        var limb;
        var lo;
        var carry = 0;
        // limbList is an array of 32-bit ints but split here into 16-bit low
        // and high words for multiplying by a 32-bit term, so the intermediate
        // 48-bit multiplication results fit into 53 bits of IEEE 754 mantissa.
        while (srcPos < limbCount) {
            limb = limbList[srcPos++];
            // Multiply lower half of limb with factor, making carry temporarily take 48 bits.
            carry += factor * (limb & 0xffff);
            // Get lowest 16 bits of full product.
            lo = carry & 0xffff;
            // Right shift by dividing because >> and >>> truncate to 32 bits before shifting.
            carry = (carry - lo) / 65536;
            // Multiply higher half of limb and combine with lowest 16 bits of full product.
            carry += factor * (limb >>> 16);
            lo |= carry << 16;
            // Lowest 32 bits of full product are added to output limb.
            limb = ((dstLimbList[dstPos] & overwriteMask) + lo) >>> 0;
            dstLimbList[dstPos++] = limb;
            // Highest 32 bits of full product stay in carry, also increment by 1 if previous sum overflowed.
            carry = (carry / 65536) >>> 0;
            // Bit twiddle equivalent to: if(limb < (lo >>> 0)) ++carry;
            carry += (lo ^ (((limb - lo) ^ lo) & ~(limb ^ lo))) >>> 31;
        }
        // Extend result by one more limb if it overflows.
        if (carry)
            dstLimbList[dstPos] = carry;
        return (carry);
    };
    BigFloat32.prototype.mulBig = function (multiplier, product) {
        if (this.isZero() || multiplier.isZero())
            return (product.setZero());
        var multiplierLimbs = multiplier.limbList;
        var lenMultiplier = multiplier.len;
        var productLimbs = product.limbList;
        var posProduct = this.len + lenMultiplier;
        product.len = posProduct;
        // TODO: Only clear from len to len + lenMultiplier
        while (posProduct--) {
            productLimbs[posProduct] = 0;
        }
        this.mulInt(multiplierLimbs[0], productLimbs, 0, 0, 0);
        for (var posMultiplier = 1; posMultiplier < lenMultiplier; ++posMultiplier) {
            this.mulInt(multiplierLimbs[posMultiplier], productLimbs, 0, posMultiplier, 0xffffffff);
        }
        product.sign = this.sign * multiplier.sign;
        product.fractionLen = this.fractionLen + multiplier.fractionLen;
        product.trimMost();
        product.trimLeast();
        return (product);
    };
    /** Multiply and return product in a new BigFloat32. */
    BigFloat32.prototype.mul = function (multiplier, product) {
        product = product || new BigFloat32();
        if (typeof (multiplier) == 'number') {
            multiplier = temp32.setNumber(multiplier);
        }
        if (product == this)
            throw (new Error('Multiplication in place is unsupported'));
        return (this.mulBig(multiplier, product));
    };
    BigFloat32.prototype.absDeltaFrom = function (other) {
        if (typeof (other) == 'number') {
            other = temp32.setNumber(other);
        }
        var limbList = this.limbList;
        var otherList = other.limbList;
        var limbCount = this.len;
        var otherCount = other.len;
        // Compare lengths.
        // Note: leading zeroes in integer part must be trimmed for this to work!
        var d = (limbCount - this.fractionLen) - (otherCount - other.fractionLen);
        // If lengths are equal, compare each limb from most to least significant.
        while (!d && limbCount && otherCount)
            d = limbList[--limbCount] - otherList[--otherCount];
        if (d)
            return (d);
        if (limbCount) {
            do
                d = limbList[--limbCount];
            while (!d && limbCount);
        }
        else if (otherCount) {
            do
                d = -otherList[--otherCount];
            while (!d && otherCount);
        }
        return (d);
    };
    BigFloat32.prototype.isZero = function () {
        return (this.len == 0);
    };
    BigFloat32.prototype.getSign = function () {
        return (this.len && this.sign);
    };
    /** Return an arbitrary number with sign matching the result of this - other. */
    BigFloat32.prototype.deltaFrom = function (other) {
        if (typeof (other) == 'number') {
            other = temp32.setNumber(other);
        }
        return (
        // Make positive and negative zero equal.
        this.len + other.len && (
        // Compare signs.
        this.sign - other.sign ||
            // Finally compare full values.
            this.absDeltaFrom(other) * this.sign));
    };
    BigFloat32.prototype.addBig = function (addend, sum) {
        var augend = this;
        var fractionLen = augend.fractionLen;
        var len = fractionLen - addend.fractionLen;
        if (len < 0) {
            len = -len;
            fractionLen += len;
            augend = addend;
            addend = this;
        }
        sum.sign = this.sign;
        sum.fractionLen = fractionLen;
        var sumLimbs = sum.limbList;
        var augendLimbs = augend.limbList;
        var addendLimbs = addend.limbList;
        var posAugend = 0;
        var posAddend = 0;
        var carry = 0;
        var limbSum;
        // If one input has more fractional limbs, just copy the leftovers to output.
        while (posAugend < len) {
            sumLimbs[posAugend] = augendLimbs[posAugend];
            ++posAugend;
        }
        var lenAddend = addend.len;
        len = augend.len - posAugend;
        if (len > lenAddend)
            len = lenAddend;
        // Calculate sum where input numbers overlap.
        while (posAddend < len) {
            carry += augendLimbs[posAugend] + addendLimbs[posAddend++];
            limbSum = carry >>> 0;
            carry = carry - limbSum && 1;
            sumLimbs[posAugend++] = limbSum;
        }
        var posSum = posAugend;
        if (len < lenAddend) {
            len = lenAddend;
            augend = addend;
            posAugend = posAddend;
            augendLimbs = addendLimbs;
        }
        else
            len = augend.len;
        // Copy leftover most significant limbs to output, propagating carry.
        while (posAugend < len) {
            carry += augendLimbs[posAugend++];
            limbSum = carry >>> 0;
            carry = carry - limbSum && 1;
            sumLimbs[posSum++] = limbSum;
        }
        if (carry)
            sumLimbs[posSum++] = carry;
        sum.len = posSum;
        sum.trimLeast();
        return (sum);
    };
    BigFloat32.prototype.subBig = function (subtrahend, difference) {
        var minuend = this;
        difference.sign = this.sign;
        // Make sure the subtrahend is the smaller number.
        if (minuend.absDeltaFrom(subtrahend) < 0) {
            minuend = subtrahend;
            subtrahend = this;
            difference.sign = -this.sign;
        }
        var fractionLen = minuend.fractionLen;
        var len = fractionLen - subtrahend.fractionLen;
        var differenceLimbs = difference.limbList;
        var minuendLimbs = minuend.limbList;
        var subtrahendLimbs = subtrahend.limbList;
        var lenMinuend = minuend.len;
        var lenSubtrahend = subtrahend.len;
        var lenFinal = lenMinuend;
        var posMinuend = 0;
        var posSubtrahend = 0;
        var posDifference = 0;
        var carry = 0;
        var limbDiff;
        if (len >= 0) {
            while (posMinuend < len) {
                differenceLimbs[posMinuend] = minuendLimbs[posMinuend];
                ++posMinuend;
            }
            len += lenSubtrahend;
            if (len > lenMinuend)
                len = lenMinuend;
            posDifference = posMinuend;
        }
        else {
            len = -len;
            fractionLen += len;
            lenFinal += len;
            while (posSubtrahend < len) {
                carry -= subtrahendLimbs[posSubtrahend];
                limbDiff = carry >>> 0;
                carry = -(carry < 0);
                differenceLimbs[posSubtrahend++] = limbDiff;
            }
            len += lenMinuend;
            if (len > lenSubtrahend)
                len = lenSubtrahend;
            posDifference = posSubtrahend;
        }
        difference.fractionLen = fractionLen;
        // Calculate difference where input numbers overlap.
        while (posDifference < len) {
            carry += minuendLimbs[posMinuend++] - subtrahendLimbs[posSubtrahend++];
            limbDiff = carry >>> 0;
            carry = -(carry < 0);
            differenceLimbs[posDifference++] = limbDiff;
        }
        // Copy leftover most significant limbs to output, propagating carry.
        while (posDifference < lenFinal) {
            carry += minuendLimbs[posMinuend++];
            limbDiff = carry >>> 0;
            carry = -(carry < 0);
            differenceLimbs[posDifference++] = limbDiff;
        }
        difference.len = posDifference;
        difference.trimMost();
        difference.trimLeast();
        return (difference);
    };
    BigFloat32.prototype.addSub = function (addend, sign, result) {
        result = result || new BigFloat32();
        if (result == this)
            throw (new Error('Addition and subtraction in place is unsupported'));
        if (typeof (addend) == 'number') {
            addend = temp32.setNumber(addend);
        }
        if (this.sign * addend.sign * sign < 0) {
            return (this.subBig(addend, result));
        }
        else {
            return (this.addBig(addend, result));
        }
    };
    /** Add and return sum in a new BigFloat32. */
    BigFloat32.prototype.add = function (addend, sum) {
        return (this.addSub(addend, 1, sum));
    };
    /** Subtract and return difference in a new BigFloat32. */
    BigFloat32.prototype.sub = function (subtrahend, difference) {
        return (this.addSub(subtrahend, -1, difference));
    };
    /** Round towards zero, to given number of base 2^32 fractional digits. */
    BigFloat32.prototype.truncate = function (fractionLimbCount) {
        var diff = this.fractionLen - fractionLimbCount;
        if (diff > 0) {
            this.fractionLen = fractionLimbCount;
            this.len -= diff;
            var len = this.len;
            var limbList = this.limbList;
            for (var pos = 0; pos < len; ++pos) {
                limbList[pos] = limbList[pos + diff];
            }
        }
        return (this);
    };
    BigFloat32.prototype.round = function (decimalCount) {
        return (this.truncate(1 + ~~(decimalCount * limbsPerDigit32)));
    };
    /** Divide by integer, replacing current value by quotient. Return integer remainder. */
    BigFloat32.prototype.divInt = function (divisor, pos) {
        var limbList = this.limbList;
        var limb;
        var hi, lo;
        var carry = 0;
        // If most significant limb is zero after dividing, decrement number of limbs remaining.
        if (limbList[pos - 1] < divisor) {
            carry = limbList[--pos];
            this.len = pos;
        }
        while (pos--) {
            limb = limbList[pos];
            carry = carry * 0x10000 + (limb >>> 16);
            hi = (carry / divisor) >>> 0;
            carry = carry - hi * divisor;
            carry = carry * 0x10000 + (limb & 0xffff);
            lo = (carry / divisor) >>> 0;
            carry = carry - lo * divisor;
            limbList[pos] = ((hi << 16) | lo) >>> 0;
        }
        return (carry);
    };
    BigFloat32.prototype.fractionToString = function (base, digitList) {
        var _a = BaseInfo32.init(base), pad = _a.pad, limbBase = _a.limbBase;
        var limbList = this.limbList;
        var limbCount = this.fractionLen;
        var limbNum = 0;
        var limbStr;
        if (base & 1) {
            throw (new Error('Conversion of floating point values to odd bases is unsupported'));
        }
        // Skip least significant limbs that equal zero.
        while (limbNum < limbCount && !limbList[limbNum])
            ++limbNum;
        if (limbNum >= limbCount)
            return;
        digitList.push('.');
        var fPart = temp32;
        fPart.limbList = limbList.slice(limbNum, limbCount);
        fPart.len = limbCount - limbNum;
        limbNum = 0;
        while (limbNum < fPart.len) {
            if (fPart.limbList[limbNum]) {
                var carry = fPart.mulInt(limbBase, fPart.limbList, limbNum, limbNum, 0);
                limbStr = carry.toString(base);
                digitList.push(pad.substr(limbStr.length) + limbStr);
            }
            else
                ++limbNum;
        }
    };
    BigFloat32.prototype.getExpansion = function (output) {
        var limbList = this.limbList;
        var len = this.len;
        var exp = this.sign;
        var pos = this.fractionLen;
        while (pos--) {
            exp *= limbInv32;
        }
        while (++pos < len) {
            output[pos] = limbList[pos] * exp;
            exp *= limbSize32;
        }
        return (len);
    };
    BigFloat32.prototype.valueOf = function () {
        var limbList = this.limbList;
        var result = 0;
        var exp = limbInv32 * this.sign;
        var len = this.fractionLen;
        var pos = 0;
        while (pos < len) {
            result = result * limbInv32 + limbList[pos++];
        }
        len = this.len;
        while (pos < len) {
            result = result * limbInv32 + limbList[pos++];
            exp *= limbSize32;
        }
        return (result * exp);
    };
    /** Convert to string in any even base supported by Number.toString.
      * @return String in lower case. */
    BigFloat32.prototype.toString = function (base) {
        if (base === void 0) { base = 10; }
        var _a = BaseInfo32.init(base), pad = _a.pad, limbBase = _a.limbBase;
        var digitList = [];
        var limbList = this.limbList;
        var limbStr;
        if (limbBase != limbSize32) {
            var iPart = temp32;
            iPart.limbList = limbList.slice(this.fractionLen, this.len);
            iPart.len = this.len - this.fractionLen;
            // Loop while 2 or more limbs remain, requiring arbitrary precision division to extract digits.
            while (iPart.len > 1) {
                limbStr = iPart.divInt(limbBase, iPart.len).toString(base);
                // Prepend digits into final result, padded with zeroes to 9 digits.
                // Since more limbs still remain, whole result will not have extra padding.
                digitList.push(pad.substr(limbStr.length) + limbStr);
            }
            // Prepend last remaining limb and sign to result.
            digitList.push('' + (iPart.limbList[0] || 0));
            if (this.sign < 0)
                digitList.push('-');
            digitList.reverse();
            // Handle fractional part.
            this.fractionToString(base, digitList);
        }
        else {
            var limbNum = this.len;
            var fractionPos = this.fractionLen;
            if (this.sign < 0)
                digitList.push('-');
            if (limbNum == fractionPos)
                digitList.push('0');
            while (limbNum--) {
                limbStr = limbList[limbNum].toString(base);
                if (limbNum == fractionPos - 1)
                    digitList.push('.');
                digitList.push(pad.substr(limbStr.length) + limbStr);
            }
        }
        // Remove leading and trailing zeroes.
        return (trimNumber(digitList.join('')));
    };
    return BigFloat32;
}());
BigFloat32.prototype.cmp = BigFloat32.prototype.deltaFrom;
var temp32 = new BigFloat32();

// This file is part of bigfloat, copyright (c) 2018- BusFaster Ltd.
var dekkerSplitter = (1 << 27) + 1;
var limbsPerDigit53 = Math.log(10) / (53 * Math.log(2));
/** See Shewchuk page 7. */
/*
function fastTwoSum(a: number, b: number, sum: number[]) {
    const estimate = a + b;

    sum[0] = b - (estimate - a);
    sum[1] = estimate;

    return(sum);
}
*/
/** Error-free addition of two floating point numbers.
  * See Shewchuk page 8. Note that output order is swapped! */
function twoSum(a, b, sum) {
    var estimate = a + b;
    var b2 = estimate - a;
    var a2 = estimate - b2;
    sum[0] = (a - a2) + (b - b2);
    sum[1] = estimate;
    return (sum);
}
/** Error-free product of two floating point numbers.
  * Store approximate result in global variable tempProduct.
  * See Shewchuk page 20.
  *
  * @return Rounding error. */
function twoProduct(a, b) {
    tempProduct = a * b;
    var a2 = a * dekkerSplitter;
    var aHi = a2 - (a2 - a);
    var aLo = a - aHi;
    var b2 = b * dekkerSplitter;
    var bHi = b2 - (b2 - b);
    var bLo = b - bHi;
    return (aLo * bLo - (tempProduct - aHi * bHi - aLo * bHi - aHi * bLo));
}
/** Arbitrary precision floating point number. Based on a multiple-component
  * expansion format and error free transformations.
  *
  * Maximum exponent is the same as for plain JavaScript numbers,
  * least significant representable binary digit is 2^-1074. */
var BigFloat53 = /** @class */ (function () {
    /** @param value Initial value, a plain JavaScript floating point number
      * (IEEE 754 double precision). */
    function BigFloat53(value, base) {
        /** List of components ordered by increasing exponent. */
        this.limbList = [];
        if (value)
            this.setValue(value, base);
    }
    BigFloat53.prototype.clone = function () {
        return (new BigFloat53().setBig(this));
    };
    /** Set value to zero.
      *
      * @return This object, for chaining. */
    BigFloat53.prototype.setZero = function () {
        this.len = 0;
        return (this);
    };
    BigFloat53.prototype.setValue = function (other, base) {
        if (typeof (other) == 'number') {
            return (this.setNumber(other));
        }
        if (other instanceof BigFloat53) {
            return (this.setBig(other));
        }
        return (this.setString(other.toString(), base || 10));
    };
    BigFloat53.prototype.setBig = function (other) {
        var len = other.len;
        this.len = len;
        for (var pos = 0; pos < len; ++pos) {
            this.limbList[pos] = other.limbList[pos];
        }
        return (this);
    };
    /** Set value to a plain JavaScript floating point number
      * (IEEE 754 double precision).
      *
      * @param value New value.
      * @return This object, for chaining. */
    BigFloat53.prototype.setNumber = function (value) {
        this.limbList[0] = value;
        this.len = value && 1;
        return (this);
    };
    BigFloat53.prototype.setString = function (value, base) {
        temp32$1[0].setValue(value, base);
        this.len = temp32$1[0].getExpansion(this.limbList);
        this.normalize();
        return (this);
    };
    /** Set value to the sum of two JavaScript numbers.
      *
      * @param a Augend.
      * @param b Addend.
      * @return This object, for chaining. */
    BigFloat53.prototype.setSum = function (a, b) {
        this.len = 2;
        twoSum(a, b, this.limbList);
        return (this);
    };
    /** Set value to the product of two JavaScript numbers.
      * @param a Multiplicand.
      * @param b Multiplier.
      * @return This object, for chaining. */
    BigFloat53.prototype.setProduct = function (a, b) {
        this.len = 2;
        this.limbList[0] = twoProduct(a, b);
        this.limbList[1] = tempProduct;
        return (this);
    };
    /** See Compress from Shewchuk page 25. */
    // TODO: Test.
    BigFloat53.prototype.normalize = function () {
        var limbList = this.limbList;
        var len = this.len;
        var limb;
        if (len) {
            var a = len - 1;
            var b = len - 1;
            var q = limbList[a];
            var err = void 0;
            while (a) {
                limb = limbList[--a];
                err = q;
                q += limb;
                err = limb - (q - err);
                limbList[b] = q;
                b -= err && 1;
                q = err || q;
            }
            limbList[b] = q;
            while (++b < len) {
                limb = limbList[b];
                err = q;
                q += limb;
                err -= q - limb;
                limbList[a] = err;
                a += err && 1;
            }
            limbList[a] = q;
            this.len = a + (q && 1);
        }
        return (this);
    };
    /** Multiply this arbitrary precision float by a number.
      * See Scale-Expansion from Shewchuk page 21.
      *
      * @param b Multiplier, a JavaScript floating point number.
      * @param product Arbitrary precision float to overwrite with result.
      * @return Modified product object. */
    BigFloat53.prototype.mulSmall = function (b, product) {
        var limbList = this.limbList;
        var productLimbs = product.limbList;
        var count = this.len;
        var t1, t2, t3;
        var srcPos = 0, dstPos = 0;
        /** Write output limb and move to next, unless a zero was written. */
        function writeLimb(limb) {
            productLimbs[dstPos] = limb;
            dstPos += limb && 1;
        }
        writeLimb(twoProduct(limbList[srcPos++], b));
        var q = tempProduct;
        while (srcPos < count) {
            t1 = twoProduct(limbList[srcPos++], b);
            t2 = q + t1;
            t3 = t2 - q;
            writeLimb(q - (t2 - t3) + (t1 - t3));
            q = tempProduct + t2;
            writeLimb(t2 - (q - tempProduct));
        }
        productLimbs[dstPos] = q;
        product.len = dstPos + (q && 1);
        return (product);
    };
    /** Multiply this by an arbitrary precision multiplier.
      * Pass all components of the multiplier to mulSmall and sum the products.
      *
      * @param multiplier Number or arbitrary precision float.
      * @param product Arbitrary precision float to overwrite with result.
      * @return Modified product object. */
    BigFloat53.prototype.mulBig = function (multiplier, product) {
        var limbList = multiplier.limbList;
        var pos = multiplier.len;
        if (!pos)
            return (product.setZero());
        --pos;
        this.mulSmall(limbList[pos], pos ? temp53[pos & 1] : product);
        while (pos) {
            --pos;
            this.mulSmall(limbList[pos], product).addBig(temp53[~pos & 1], 1, pos ? temp53[pos & 1] : product);
        }
        return (product);
    };
    /** Multiply number or arbitrary precision float with this one
      * and store result in another BigFloat53.
      *
      * @param multiplier Number or arbitrary precision float.
      * @param product Arbitrary precision float to overwrite with result.
      * If omitted, a new one is allocated.
      * @return Modified product object. */
    BigFloat53.prototype.mul = function (multiplier, product) {
        product = product || new BigFloat53();
        if (typeof (multiplier) == 'number') {
            return (this.mulSmall(multiplier, product));
        }
        if (product == this)
            throw (new Error('Cannot multiply in place'));
        return (this.mulBig(multiplier, product));
    };
    BigFloat53.prototype.isZero = function () {
        var limbList = this.limbList;
        var pos = this.len;
        while (pos--) {
            if (limbList[pos])
                return (false);
        }
        return (true);
    };
    BigFloat53.prototype.getSign = function () {
        var t = this.len;
        return (t && (t = this.limbList[t - 1]) && (t > 0 ? 1 : -1));
    };
    /** Return an arbitrary number with sign matching the result of this - other. */
    // TODO: Test.
    BigFloat53.prototype.deltaFrom = function (other) {
        var t = this.len;
        var sign = this.getSign();
        var diff = sign;
        if (typeof (other) != 'number') {
            t = other.len;
            diff -= t && (t = other.limbList[t - 1]) && (t > 0 ? 1 : -1);
            if (diff || !sign)
                return (diff);
            this.addBig(other, -1, temp53[0]);
        }
        else {
            diff -= other && (other > 0 ? 1 : -1);
            if (diff || !sign)
                return (diff);
            this.addSmall(-other, temp53[0]);
        }
        t = temp53[0].len;
        return (t && temp53[0].limbList[t - 1]);
    };
    /** Add a number to this arbitrary precision float.
      * See Grow-Expansion from Shewchuk page 10.
      *
      * @param b JavaScript floating point number to add.
      * @param sum Arbitrary precision float to overwrite with result.
      * @return Modified sum object. */
    BigFloat53.prototype.addSmall = function (b, sum) {
        var limbList = this.limbList;
        var sumLimbs = sum.limbList;
        var count = this.len;
        var estimate;
        var a, b2, err;
        var srcPos = 0, dstPos = 0;
        while (srcPos < count) {
            a = limbList[srcPos++];
            estimate = a + b;
            b2 = estimate - a;
            a -= estimate - b2;
            err = a + (b - b2);
            sumLimbs[dstPos] = err;
            dstPos += err && 1;
            b = estimate;
        }
        sumLimbs[dstPos] = b;
        sum.len = dstPos + (b && 1);
        return (sum);
    };
    /** Add another arbitrary precision float (multiplied by sign) to this one.
      * See Fast-Expansion-Sum from Shewchuk page 13.
      *
      * @param sign Multiplier for negating addend to implement subtraction.
      * @param sum Arbitrary precision float to overwrite with result.
      * @return Modified sum object. */
    BigFloat53.prototype.addBig = function (addend, sign, sum) {
        var augendLimbs = this.limbList;
        var addendLimbs = addend.limbList;
        var sumLimbs = sum.limbList;
        var count = this.len + addend.len;
        var nextAugendPos = 0;
        var nextAddendPos = 0;
        var nextSumPos = 0;
        /** Latest limb of augend. */
        var a = augendLimbs[nextAugendPos++];
        /** Latest limb of addend. */
        var b = addendLimbs[nextAddendPos++] * sign;
        /** Magnitude of latest augend limb. */
        var a2 = a < 0 ? -a : a;
        /** Magnitude of latest addend limb. */
        var b2 = b < 0 ? -b : b;
        var nextLimb, nextLimb2, prevLimb;
        var err;
        if (!count)
            return (sum.setZero());
        // Append sentinel limbs to avoid testing for end of array.
        augendLimbs[this.len] = Infinity;
        addendLimbs[addend.len] = Infinity;
        /** Get next smallest limb from either augend or addend.
          * This avoids merging the two limb lists. */
        function getNextLimb() {
            var result;
            if (a2 < b2) {
                result = a;
                a = augendLimbs[nextAugendPos++];
                a2 = a < 0 ? -a : a;
            }
            else {
                result = b;
                b = addendLimbs[nextAddendPos++] * sign;
                b2 = b < 0 ? -b : b;
            }
            return (result);
        }
        var limb = getNextLimb();
        while (--count) {
            nextLimb = getNextLimb();
            prevLimb = limb;
            limb += nextLimb;
            nextLimb2 = limb - prevLimb;
            err = (prevLimb - (limb - nextLimb2)) + (nextLimb - nextLimb2);
            sumLimbs[nextSumPos] = err;
            nextSumPos += err && 1;
        }
        sumLimbs[nextSumPos] = limb;
        sum.len = nextSumPos + (limb && 1);
        return (sum);
    };
    BigFloat53.prototype.addSub = function (addend, sign, result) {
        result = result || new BigFloat53();
        if (typeof (addend) == 'number')
            return (this.addSmall(sign * addend, result));
        return (this.addBig(addend, sign, result));
    };
    /** Add number or arbitrary precision float to this one
      * and store result in another BigFloat53.
      *
      * @param addend Number or arbitrary precision float.
      * @param sum Arbitrary precision float to overwrite with result.
      * If omitted, a new one is allocated.
      * @return Modified sum object. */
    BigFloat53.prototype.add = function (addend, sum) {
        return (this.addSub(addend, 1, sum));
    };
    /** Subtract number or arbitrary precision float from this one
      * and store result in another BigFloat53.
      *
      * @param subtrahend Number or arbitrary precision float.
      * @param difference Arbitrary precision float to overwrite with result.
      * If omitted, a new one is allocated.
      * @return Modified difference object. */
    BigFloat53.prototype.sub = function (subtrahend, difference) {
        return (this.addSub(subtrahend, -1, difference));
    };
    /** Round towards zero, to (at least) given number of base 2^53 fractional digits. */
    BigFloat53.prototype.truncate = function (fractionLimbCount) {
        this.normalize();
        var limbList = this.limbList;
        var len = this.len;
        // Use binary search to find last |limb| < 1.
        var lo = 0;
        var hi = len;
        var mid = 0;
        var limb = 0;
        while (lo < hi) {
            mid = (lo + hi) >> 1;
            limb = limbList[mid];
            if (limb > -1 && limb < 1) {
                lo = mid + 1;
            }
            else {
                hi = mid;
            }
        }
        if (mid && (limb <= -1 || limb >= 1)) {
            limb = limbList[--mid];
        }
        // Slice off limbs before and including it,
        // except the fractionLimbCount last ones.
        mid -= fractionLimbCount - 1;
        if (mid > 0) {
            this.len -= mid;
            len = this.len;
            for (var pos = 0; pos < len; ++pos) {
                limbList[pos] = limbList[pos + mid];
            }
        }
        return (this);
    };
    BigFloat53.prototype.round = function (decimalCount) {
        return (this.truncate(1 + ~~(decimalCount * limbsPerDigit53)));
    };
    BigFloat53.prototype.valueOf = function () {
        var limbList = this.limbList;
        var len = this.len;
        var result = 0;
        for (var pos = 0; pos < len; ++pos) {
            result += limbList[pos];
        }
        return (result);
    };
    /** Convert to string in any even base supported by Number.toString.
      * @return String in lower case. */
    BigFloat53.prototype.toString = function (base) {
        var limbList = this.limbList;
        var pos = this.len;
        temp32$1[pos & 1].setZero();
        while (pos--) {
            temp32$1[~pos & 1].add(limbList[pos], temp32$1[pos & 1]);
        }
        return (temp32$1[~pos & 1].toString(base));
    };
    return BigFloat53;
}());
BigFloat53.prototype.cmp = BigFloat53.prototype.deltaFrom;
/** Latest approximate product from twoProduct. */
var tempProduct = 0;
/** Temporary values for internal calculations. */
var temp32$1 = [new BigFloat32(), new BigFloat32()];
/** Temporary values for internal calculations. */
var temp53 = [new BigFloat53(), new BigFloat53()];

// This file is part of bigfloat, copyright (c) 2018- BusFaster Ltd.
/** Simpler replacement for the default TypeScript helper.
  * Ignores static members and avoids rollup warnings. */
function __extends(child, parent) {
    function helper() { this.constructor = child; }
    helper.prototype = parent.prototype;
    child.prototype = new helper();
}
var BigComplex = /** @class */ (function () {
    function BigComplex(real, imag, base) {
        this.real = typeof (real) == 'object' ? real : new this.Base(real, base);
        this.imag = typeof (imag) == 'object' ? imag : new this.Base(imag, base);
    }
    BigComplex.prototype.clone = function () {
        var other = new this.constructor(this.real.clone(), this.imag.clone());
        return (other);
    };
    BigComplex.prototype.setZero = function () {
        this.real.setZero();
        this.imag.setZero();
        return (this);
    };
    BigComplex.prototype.setValue = function (other) {
        this.real.setValue(other.real);
        this.imag.setValue(other.imag);
        return (this);
    };
    BigComplex.prototype.mul = function (multiplier, product) {
        product = product || new this.constructor();
        if (multiplier instanceof BigComplex) {
            this.real.mul(multiplier.real, this.temp1);
            this.imag.mul(multiplier.imag, this.temp2);
            this.temp1.sub(this.temp2, product.real);
            this.real.mul(multiplier.imag, this.temp1);
            this.imag.mul(multiplier.real, this.temp2);
            this.temp1.add(this.temp2, product.imag);
        }
        else {
            this.real.mul(multiplier, product.real);
            this.imag.mul(multiplier, product.imag);
        }
        return (product);
    };
    BigComplex.prototype.sqr = function (product) {
        product = product || new this.constructor();
        this.real.mul(this.real, this.temp1);
        this.imag.mul(this.imag, this.temp2);
        this.temp1.sub(this.temp2, product.real);
        this.real.mul(this.imag, this.temp1);
        this.temp1.add(this.temp1, product.imag);
        return (product);
    };
    BigComplex.prototype.add = function (addend, sum) {
        sum = sum || new this.constructor();
        if (addend instanceof BigComplex) {
            this.real.add(addend.real, sum.real);
            this.imag.add(addend.imag, sum.imag);
        }
        else {
            this.real.add(addend, sum.real);
        }
        return (sum);
    };
    BigComplex.prototype.sub = function (subtrahend, difference) {
        difference = difference || new this.constructor();
        if (subtrahend instanceof BigComplex) {
            this.real.sub(subtrahend.real, difference.real);
            this.imag.sub(subtrahend.imag, difference.imag);
        }
        else {
            this.real.sub(subtrahend, difference.real);
        }
        return (difference);
    };
    BigComplex.prototype.truncate = function (fractionLimbCount) {
        this.real.truncate(fractionLimbCount);
        this.imag.truncate(fractionLimbCount);
        return (this);
    };
    return BigComplex;
}());
var BigComplex32 = /** @class */ (function (_super) {
    __extends(BigComplex32, _super);
    function BigComplex32() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return BigComplex32;
}(BigComplex));
var BigComplex53 = /** @class */ (function (_super) {
    __extends(BigComplex53, _super);
    function BigComplex53() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return BigComplex53;
}(BigComplex));
BigComplex32.prototype.Base = BigFloat32;
BigComplex32.prototype.temp1 = new BigFloat32();
BigComplex32.prototype.temp2 = new BigFloat32();
BigComplex53.prototype.Base = BigFloat53;
BigComplex53.prototype.temp1 = new BigFloat53();
BigComplex53.prototype.temp2 = new BigFloat53();

// This file is part of bigfloat, copyright (c) 2015- BusFaster Ltd.

exports.BigFloat32 = BigFloat32;
exports.BigFloat53 = BigFloat53;
exports.BigComplex32 = BigComplex32;
exports.BigComplex53 = BigComplex53;
exports.trimNumber = trimNumber;
exports.numberToString = numberToString;

})
		]
	]
}, {
	name: "classy-mst",
	version: "3.14.0",
	root: "node_modules/classy-mst",
	main: "dist/cjs/index.js",
	files: [
		[
			/* classy-mst: 1 */
			"dist/cjs/index.js", ["cjs","js"], {"./classy-mst": 2}, (function(GLOBAL, __dirname, __filename, exports, global, module, process, require) {
"use strict";
// This file is part of classy-mst, copyright (c) 2017- BusFaster Ltd.
// Released under the MIT license, see LICENSE.
Object.defineProperty(exports, "__esModule", { value: true });
var classy_mst_1 = require("./classy-mst");
exports.mst = classy_mst_1.mst;
exports.shim = classy_mst_1.shim;
exports.action = classy_mst_1.action;
exports.polymorphic = classy_mst_1.polymorphic;
exports.setTypeTag = classy_mst_1.setTypeTag;
exports.mstWithChildren = classy_mst_1.mstWithChildren;

})
		], [
			/* classy-mst: 2 */
			"dist/cjs/classy-mst.js", ["cjs","js"], {"mobx-state-tree": 21}, (function(GLOBAL, __dirname, __filename, exports, global, module, process, require) {
"use strict";
// This file is part of classy-mst, copyright (c) 2017- BusFaster Ltd.
// Released under the MIT license, see LICENSE.
Object.defineProperty(exports, "__esModule", { value: true });
var mobx_state_tree_1 = require("mobx-state-tree");
exports.typeTag = '$';
function setTypeTag(tag) {
    exports.typeTag = tag;
}
exports.setTypeTag = setTypeTag;
function dummyGetter() { }
/** Force TypeScript to accept an MST model as a superclass.
  * @param model Model (MST tree node) */
function shim(Model, Parent) {
    function BaseClass() { }
    if (Parent && Parent.$proto) {
        BaseClass.prototype = Parent.$proto;
        BaseClass.prototype = new BaseClass();
        BaseClass.prototype.$parent = Parent;
        if (BaseClass.prototype.$actions)
            BaseClass.prototype.$actions = {};
    }
    else {
        BaseClass.prototype = {};
    }
    return BaseClass;
}
exports.shim = shim;
/** Decorator for actions. By default the mst function treats methods as views. */
function action(target, key) {
    (target.$actions || (target.$actions = {}))[key] = true;
}
exports.action = action;
var internalMembers = {
    constructor: true,
    $actions: true,
    $parent: true
};
function renameFunction(func, name) {
    Object.defineProperty(func, 'name', { value: name, writable: false });
}
// Test if renaming functions works to avoid errors / useless attempts.
try {
    renameFunction(dummyGetter, 'dummy');
}
catch (err) { }
var renamableFunctions = (dummyGetter.name == 'dummy');
/** Add methods from an ES6 class into an MST model.
  * @param code Class with methods to add as views (the default)
  *   and actions (if decorated).
  * @param data MST model with properties.
  * @param modelName Model name for debugging and polymorphic type tags in snapshots. */
function mst(Code, Data, modelName, options) {
    var viewList = [];
    var actionList = [];
    var descList = [];
    var memberTbl = Code.prototype;
    var actionTbl = memberTbl.$actions;
    var volatileTbl = {};
    if (modelName && typeof (modelName) == 'object') {
        options = modelName;
        modelName = options.name;
    }
    else
        options = options || {};
    // Extract views, actions, getters and setters from the class prototype.
    for (var _i = 0, _a = Object.getOwnPropertyNames(memberTbl); _i < _a.length; _i++) {
        var name = _a[_i];
        if (internalMembers[name])
            continue;
        var desc = Object.getOwnPropertyDescriptor && Object.getOwnPropertyDescriptor(memberTbl, name);
        if (!desc || (desc.configurable && desc.writable && !desc.get && !desc.set)) {
            var value = memberTbl[name];
            var spec = { name: name, value: value };
            if (actionTbl && actionTbl[name])
                actionList.push(spec);
            else
                viewList.push(spec);
        }
        else {
            descList.push({ name: name, value: desc });
        }
    }
    // Create a sample instance and extract volatile members
    // defined in the constructor.
    var instance = new Code();
    var volatileList = Object.getOwnPropertyNames(instance);
    for (var _b = 0, volatileList_1 = volatileList; _b < volatileList_1.length; _b++) {
        var name = volatileList_1[_b];
        volatileTbl[name] = instance[name];
    }
    // Apply optional name given to the model.
    if (modelName)
        Data = Data.named(modelName);
    // Bind views, actions and volatile state to the model.
    var Model = Data;
    Model = options.sealed ? Model : Model.preProcessSnapshot(
    // Instantiating a union of models requires a snapshot.
    function (snap) { return snap || {}; });
    Model = Model.postProcessSnapshot(function (snap) {
        if (modelName && exports.typeTag && Code.prototype.$parent)
            snap[exports.typeTag] = modelName;
        return (snap);
    }).actions(function (self) {
        var result = {};
        var _loop_1 = function (name, value) {
            var method = function () {
                return (value.apply(self, arguments));
            };
            if (renamableFunctions) {
                renameFunction(method, modelName + '.' + name);
            }
            result[name] = method;
        };
        for (var _i = 0, actionList_1 = actionList; _i < actionList_1.length; _i++) {
            var _a = actionList_1[_i], name = _a.name, value = _a.value;
            _loop_1(name, value);
        }
        return (result);
    });
    Model = !(viewList.length + descList.length) ? Model : Model.views(function (self) {
        var result = {};
        var _loop_2 = function (name, value) {
            result[name] = function () {
                return (value.apply(self, arguments));
            };
        };
        for (var _i = 0, viewList_1 = viewList; _i < viewList_1.length; _i++) {
            var _a = viewList_1[_i], name = _a.name, value = _a.value;
            _loop_2(name, value);
        }
        var _loop_3 = function (name, value) {
            var desc = {};
            for (var _i = 0, _a = Object.getOwnPropertyNames(value); _i < _a.length; _i++) {
                var key = _a[_i];
                desc[key] = value[key];
            }
            var get = desc.get, set = desc.set;
            if (get) {
                desc.get = function () { return get.call(self); };
            }
            else if (set) {
                // Properties with only setters still need a getter defined here,
                // or mobx-state-tree will ignore them.
                desc.get = dummyGetter;
            }
            if (set)
                desc.set = function (value) { return set.call(self, value); };
            // Allow mobx-state-tree to see the property, or it gets ignored.
            desc.enumerable = true;
            Object.defineProperty(result, name, desc);
        };
        for (var _b = 0, descList_1 = descList; _b < descList_1.length; _b++) {
            var _c = descList_1[_b], name = _c.name, value = _c.value;
            _loop_3(name, value);
        }
        return (result);
    });
    Model = !volatileList.length ? Model : Model.volatile(function (self) { return volatileTbl; });
    return (options.sealed ? Model : polymorphic(Code, Model, modelName));
}
exports.mst = mst;
function polymorphic(Code, Model, modelName) {
    // Union of this class and all of its subclasses.
    // Late evaluation allows subclasses to add themselves to the type list
    // before any instances are created.
    var Union = mobx_state_tree_1.types.late(function () { return mobx_state_tree_1.types.union.apply(mobx_state_tree_1.types, Union.$typeList); });
    // First item in the type list is a dispatcher function
    // for parsing type tags in snapshots.
    Union.$typeList = [{ dispatcher: function (snap) {
                return (snap && exports.typeTag && snap[exports.typeTag] && Union.$typeTbl[snap[exports.typeTag]]) || Model;
            }
        }];
    Union.$typeTbl = {};
    Union.$proto = Code.prototype;
    // Copy methods from model object into returned union,
    // making it work like a regular model.
    for (var mixin = Model; mixin; mixin = Object.getPrototypeOf(mixin)) {
        var _loop_4 = function (key) {
            var desc = Object.getOwnPropertyDescriptor && Object.getOwnPropertyDescriptor(mixin, key);
            if (!desc || (desc.configurable && desc.writable && !desc.get && !desc.set)) {
                var value_1 = !(key in Union) && mixin[key];
                if (typeof (value_1) == 'function') {
                    Union[key] = function () {
                        return (value_1.apply(Model, arguments));
                    };
                }
            }
        };
        for (var _i = 0, _a = Object.getOwnPropertyNames(mixin); _i < _a.length; _i++) {
            var key = _a[_i];
            _loop_4(key);
        }
    }
    // Initialize union of allowed class substitutes with the class itself,
    // and augment unions of all parent classes with this subclass,
    // to allow polymorphism.
    for (var Class = Union; Class; Class = Class.$proto.$parent) {
        var typeList = Class.$typeList;
        var typeTbl = Class.$typeTbl;
        if (typeList)
            typeList.push(Model);
        if (typeTbl && modelName)
            typeTbl[modelName] = Model;
    }
    return (Union);
}
exports.polymorphic = polymorphic;
function mstWithChildren(Code, Data, name) {
    var Children = mobx_state_tree_1.types.array(mobx_state_tree_1.types.late(function () { return Model; }));
    var Branch = Data.props({
        children: mobx_state_tree_1.types.maybe(Children)
    });
    var Model = mst(Code, Branch, 'Node');
    return ({ Model: Model, Children: Children });
}
exports.mstWithChildren = mstWithChildren;

})
		]
	]
}, {
	name: "fracts",
	version: "0.1.0",
	root: "../fracts",
	main: "index.js",
	files: [
		[
			/* fracts: 3 */
			"src/util.ts", ["cjs","js","ts"], {"bigfloat": 0}, (function(GLOBAL, __dirname, __filename, exports, global, module, process, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bigfloat_1 = require("bigfloat");
exports.tempFloats = [new bigfloat_1.BigFloat32(), new bigfloat_1.BigFloat32(), new bigfloat_1.BigFloat32()];
/** Calculate sign of the 2D cross product AKA perp dot product AKA 2x2 matrix
  * determinant. Always correct, using arbitrary precision if needed.
  *
  * @return Zero or an arbitrary number with sign matching the determinant. */
function detSign(a1, b1, b2, a2) {
    var a = a1.valueOf() * a2.valueOf();
    var b = b1.valueOf() * b2.valueOf();
    // Similar to: return(Math.sign(a - b));
    return (+(a > b) - +(a < b) ||
        // If a and b seem equal, check again using arbitrary precision math.
        a1.mul(a2, exports.tempFloats[0]).deltaFrom(b1.mul(b2, exports.tempFloats[1])));
}
exports.detSign = detSign;
})
		], [
			/* fracts: 4 */
			"src/index.ts", ["cjs","js","ts"], {"./History": 10, "./KeyFrame": 9, "./Render": 6}, (function(GLOBAL, __dirname, __filename, exports, global, module, process, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var History_1 = require("./History");
var KeyFrame_1 = require("./KeyFrame");
var Render_1 = require("./Render");
var history = new History_1.State();
var content = document.getElementById('content');
var canvas = document.getElementById('gc');
var bgCanvas = [
    document.getElementById('bg1'),
    document.getElementById('bg2')
];
var gc = [
    bgCanvas[0].getContext('2d'),
    bgCanvas[1].getContext('2d')
];
var render = new Render_1.Render(canvas);
/*
// const ratio = window.devicePixelRatio;
const ratio = 1.0;
const width = canvas.offsetWidth * ratio;
const height = canvas.offsetHeight * ratio;
*/
/*
let frameNum = 0;
const frameCount = 19;

function foo()  {
    if(frameNum < frameCount) {
        window.requestAnimationFrame(foo);
    }

    if(frameNum) render.draw(frame);

    ++frameNum;
}

foo();
*/
var step = -1 / 16;
var zooming = false;
var mx = canvas.offsetWidth / 2;
var my = canvas.offsetHeight / 2;
function hideHelp() {
    document.getElementById('fullscreen').style.display = 'none';
    document.getElementById('help').style.display = 'none';
    document.getElementById('github').style.display = 'none';
}
var frame;
var bgNum = 0;
function animate() {
    var _a, _b;
    window.requestAnimationFrame(animate);
    if (zooming || !frame) {
        var ratio = 1.0;
        var width = canvas.offsetWidth * ratio;
        var height = canvas.offsetHeight * ratio;
        var size = Math.min(width, height);
        var x = void 0, y = void 0, z = void 0;
        if (zooming)
            history.view.zoomTo((mx * 2 - width) / size, (height - my * 2) / size, step);
        if (!frame || history.view.zoomExponent <= frame.view.zoomExponent - 1) {
            if (frame) {
                (_a = history.view.toLocal(frame.view.center.value.real, frame.view.center.value.imag), x = _a.x, y = _a.y);
                z = Math.pow(2, frame.view.zoomExponent - history.view.zoomExponent);
                bgNum = 1 - bgNum;
                if (bgCanvas[bgNum].width != width)
                    bgCanvas[bgNum].width = width;
                if (bgCanvas[bgNum].height != height)
                    bgCanvas[bgNum].height = height;
                gc[bgNum].clearRect(0, 0, width, height);
                gc[bgNum].drawImage(bgCanvas[1 - bgNum], (width - (width + x * size) / z) / 2, (height - (height - y * size) / z) / 2, width, height, 0, 0, width * z, height * z);
                gc[bgNum].drawImage(canvas, (width - (width + x * size) / z) / 2, (height - (height - y * size) / z) / 2, width, height, 0, 0, width * z, height * z);
                bgCanvas[bgNum].style.visibility = 'visible';
                bgCanvas[1 - bgNum].style.visibility = 'hidden';
            }
            frame = new KeyFrame_1.KeyFrame(history.view, {
                maxIterations: 64 * 2,
                maxPeriod: 8192,
                widthPixels: width,
                heightPixels: height
            });
        }
        // Transform canvas so frame.view corresponds to history.view
        // http://127.0.0.1:8080/?imag=0.1c06d586455aed802a8&real=-0.c51853637238e184ec&zoom=-14
        (_b = history.view.toLocal(frame.view.center.value.real, frame.view.center.value.imag), x = _b.x, y = _b.y);
        x *= size / 2;
        y *= -size / 2;
        //	const x = frame.view.center.value.real.valueOf() - history.view.center.value.real.valueOf();
        //	const y = frame.view.center.value.imag.valueOf() - history.view.center.value.imag.valueOf();
        z = Math.pow(2, frame.view.zoomExponent - history.view.zoomExponent);
        canvas.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + z + ')';
        bgCanvas[bgNum].style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + z + ')';
    }
    render.draw(frame);
}
animate();
content.onmousemove = function (e) {
    mx = e.clientX;
    my = e.clientY;
};
content.onmousedown = function (e) {
    zooming = true;
    hideHelp();
    mx = e.clientX;
    my = e.clientY;
};
content.onmouseup = function (e) {
    zooming = false;
};
content.onmouseout = function (e) {
    zooming = false;
};
document.getElementById('fullscreen').onclick = function (e) {
    hideHelp();
    try {
        var element = document.documentElement;
        (element.requestFullscreen ||
            element.webkitRequestFullscreen ||
            element.mozRequestFullScreen ||
            element.msRequestFullscreen).call(element);
    }
    catch (err) { }
};
})
		], [
			/* fracts: 5 */
			"src/Shader.ts", ["cjs","js","ts"], {}, (function(GLOBAL, __dirname, __filename, exports, global, module, process, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Shader = /** @class */ (function () {
    function Shader(gl, spec) {
        this.gl = gl;
        this.attributeEnabledList = [];
        var program = gl.createProgram();
        gl.attachShader(program, this.compile(spec.vertex, gl.VERTEX_SHADER));
        gl.attachShader(program, this.compile(spec.fragment, gl.FRAGMENT_SHADER));
        for (var _i = 0, _a = Object.keys(spec.attributes); _i < _a.length; _i++) {
            var kind = _a[_i];
            var num = +kind;
            gl.bindAttribLocation(program, num, spec.attributes[num]);
            this.attributeEnabledList[num] = true;
        }
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw (new Error('Shader link error: ' + gl.getProgramInfoLog(program)));
        }
        gl.useProgram(program);
        this.program = program;
    }
    Shader.prototype.activate = function (oldAttributeEnabledList) {
        if (oldAttributeEnabledList === void 0) { oldAttributeEnabledList = []; }
        var gl = this.gl;
        gl.useProgram(this.program);
        var attributeCount = Math.max(this.attributeEnabledList.length, oldAttributeEnabledList.length);
        for (var num = 0; num < attributeCount; ++num) {
            var enabled = this.attributeEnabledList[num];
            if (enabled != oldAttributeEnabledList[num]) {
                if (enabled) {
                    gl.enableVertexAttribArray(num);
                }
                else {
                    gl.disableVertexAttribArray(num);
                }
            }
        }
        return (this.attributeEnabledList);
    };
    /** @param source Plain-text WebGL shader source code.
      * @param kind gl.VERTEX_SHADER or gl.FRAGMENT_SHADER. */
    Shader.prototype.compile = function (source, kind) {
        var gl = this.gl;
        var shader = gl.createShader(kind);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw (new Error('Shader compile error: ' + gl.getShaderInfoLog(shader)));
        }
        return (shader);
    };
    Shader.prototype.getUniformLocations = function (nameList) {
        var _this = this;
        return (nameList.map(function (name) {
            var num = _this.gl.getUniformLocation(_this.program, name);
            if (!num && num !== 0)
                throw (new Error('Missing WebGL uniform ' + name));
            return num;
        }));
    };
    return Shader;
}());
exports.Shader = Shader;
})
		], [
			/* fracts: 6 */
			"src/Render.ts", ["cjs","js","ts"], {"../glsl/calculate.frag": 17, "../glsl/calculate.vert": 16, "../glsl/colorize.frag": 15, "../glsl/colorize.vert": 14, "../glsl/count.frag": 13, "../glsl/count.vert": 12, "./Shader": 5}, (function(GLOBAL, __dirname, __filename, exports, global, module, process, require) {
"use strict";
/// <reference path="glsl.d.ts" />
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var Shader_1 = require("./Shader");
var calculate_vert_1 = __importDefault(require("../glsl/calculate.vert"));
var calculate_frag_1 = __importDefault(require("../glsl/calculate.frag"));
var count_vert_1 = __importDefault(require("../glsl/count.vert"));
var count_frag_1 = __importDefault(require("../glsl/count.frag"));
var colorize_vert_1 = __importDefault(require("../glsl/colorize.vert"));
var colorize_frag_1 = __importDefault(require("../glsl/colorize.frag"));
var countBlockSize = 32;
var perturbStride = 256;
var thumbSize = 0;
var countInterval = 2;
var readInterval = 6;
var renderInterval = 4;
var xy32 = new Float32Array(2);
function die(msg) {
    throw (new Error(msg));
}
var Render = /** @class */ (function () {
    function Render(canvas) {
        this.canvas = canvas;
        this.textures = [];
        var gl = canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true }) || die('Error creating WebGL context');
        this.gl = gl;
        // Floating point textures are needed for writing a reference orbit
        // to WebGL and storing per-pixel orbit state between frames.
        gl.getExtension('OES_texture_float') || die('Float textures are unsupported on this machine');
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.clearColor(1, 0, 1, 0.25);
        this.initFramebuffer();
        this.initShader();
        this.initGeometry();
        this.initInputTexture();
    }
    Render.prototype.initShader = function () {
        var _a, _b, _c, _d, _e, _f;
        var gl = this.gl;
        this.calcShader = new Shader_1.Shader(gl, {
            vertex: calculate_vert_1.default,
            fragment: calculate_frag_1.default,
            attributes: (_a = {},
                _a[0 /* aPos */] = 'aPos',
                _a)
        });
        _b = this.getUniformLocations(this.calcShader, [
            'uCenterHi', 'uScale', 'uSize', 'uZoom', 'uOrbit', 'uData', 'uIter', 'uReferenceOffset', 'uExact'
        ]), this.uCenterHi = _b[0], this.uScale = _b[1], this.uSize = _b[2], this.uZoomCalc = _b[3], this.uOrbitCalc = _b[4], this.uDataCalc = _b[5], this.uIterCalc = _b[6], this.uReferenceOffset = _b[7], this.uExact = _b[8];
        this.countShader = new Shader_1.Shader(gl, {
            vertex: count_vert_1.default.replace(/BLOCK_SIZE/g, countBlockSize + '.0'),
            fragment: count_frag_1.default.replace(/BLOCK_SIZE/g, countBlockSize + '.0'),
            attributes: (_c = {},
                _c[0 /* aPos */] = 'aPos',
                _c)
        });
        _d = this.getUniformLocations(this.countShader, [
            'uData', 'uSize', 'uIter'
        ]), this.uDataCount = _d[0], this.uSizeCount = _d[1], this.uIterCount = _d[2];
        this.colorShader = new Shader_1.Shader(gl, {
            vertex: colorize_vert_1.default,
            fragment: colorize_frag_1.default,
            attributes: (_e = {},
                _e[0 /* aPos */] = 'aPos',
                _e)
        });
        _f = this.getUniformLocations(this.colorShader, [
            'uZoom', 'uOrbit', 'uData', 'uTransparent'
        ]), this.uZoomColor = _f[0], this.uOrbitColor = _f[1], this.uDataColor = _f[2], this.uTransparentColor = _f[3];
    };
    /** 2 buffers gives 8 channels. We need 7:
      * - real and imag z
      * - real and imag dz/dc
      * - iter and period
      * - distMin for finding period
      * When rendering, a uniform flag should control if the previous state is valid data.
      * If iter is set, assume point escaped, otherwise keep iterating. */
    Render.prototype.initFramebuffer = function () {
        var gl = this.gl;
        var ext = gl.getExtension('WEBGL_draw_buffers') || die('Rendering to multiple textures is unsupported on this machine');
        var attachments = [
            ext.COLOR_ATTACHMENT0_WEBGL,
            ext.COLOR_ATTACHMENT1_WEBGL
        ];
        this.ext = ext;
        this.frameBuffer = gl.createFramebuffer() || die('Error creating WebGL framebuffer');
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
        for (var num = 0; num < 4; ++num) {
            var tex = gl.createTexture() || die('Error creating WebGL texture');
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 640, 480, 0, gl.RGBA, gl.FLOAT, null);
            this.textures[num] = tex;
        }
        ext.drawBuffersWEBGL(attachments);
    };
    Render.prototype.initGeometry = function () {
        var gl = this.gl;
        var vertices = [
            -1, -1,
            -1, 1,
            1, -1,
            1, 1
        ];
        gl.enableVertexAttribArray(0 /* aPos */);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer() || die('Error creating WebGL buffer'));
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        gl.vertexAttribPointer(0 /* aPos */, 2, gl.FLOAT, false, 0, 0);
    };
    Render.prototype.initInputTexture = function () {
        var gl = this.gl;
        this.refTexture = gl.createTexture() || die('Error creating input texture');
        gl.bindTexture(gl.TEXTURE_2D, this.refTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };
    Render.prototype.getUniformLocations = function (shader, nameList) {
        var _this = this;
        return nameList.map(function (name) {
            var num = _this.gl.getUniformLocation(shader.program, name);
            if (!num && num !== 0)
                throw (new Error('Missing WebGL uniform ' + name));
            return num;
        });
    };
    Render.prototype.resize = function (width, height) {
        var gl = this.gl;
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
        document.getElementById('gc2').width = width;
        document.getElementById('gc2').height = height;
        gl.viewport(0, 0, width, height);
        // const width2 = Math.pow(2, Math.ceil(Math.log(width) / Math.log(2)));
        // const height2 = Math.pow(2, Math.ceil(Math.log(height) / Math.log(2)));
        for (var num = 0; num < 4; ++num) {
            gl.bindTexture(gl.TEXTURE_2D, this.textures[num]);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, null);
        }
    };
    Render.prototype.bindCalcShader = function (pass, data) {
        var gl = this.gl;
        this.calcShader.activate([]);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.refTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, perturbStride, perturbStride, 0, gl.RGBA, gl.FLOAT, data);
        gl.uniform1i(this.uExact, 0);
        var inputOffset = (pass & 1) * 2;
        var outputOffset = 2 - inputOffset;
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[inputOffset + 0]);
        gl.uniform1i(this.uOrbitCalc, 1);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[inputOffset + 1]);
        gl.uniform1i(this.uDataCalc, 2);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, this.ext.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, this.textures[outputOffset + 0], 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, this.ext.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, this.textures[outputOffset + 1], 0);
        // if(gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
        // die('Error configuring WebGL framebuffer');
        // }
    };
    Render.prototype.bindColorShader = function (pass) {
        var gl = this.gl;
        this.colorShader.activate([]);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        var inputOffset = (pass & 1) * 2;
        var outputOffset = 2 - inputOffset;
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[outputOffset + 0]);
        gl.uniform1i(this.uOrbitColor, 1);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[outputOffset + 1]);
        gl.uniform1i(this.uDataColor, 2);
    };
    /** Count unescaped pixels in a rendered set.
      * Must be called immediately after executing the calculation shader. */
    Render.prototype.updateUnescapedCount = function (keyFrame) {
        var width = keyFrame.width, height = keyFrame.height;
        var gl = this.gl;
        var sizeMax = Math.max(width, height);
        this.countShader.activate([]);
        gl.uniform1i(this.uDataCount, 2);
        gl.uniform2f(this.uSizeCount, width, height);
        gl.uniform1i(this.uIterCount, keyFrame.renderPassCount);
        gl.colorMask(false, false, false, true);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.colorMask(true, true, true, true);
        // Pixels are counted in nested blocks.
        // Every frame increments the "recursion depth".
        // Result is correct only after all nesting levels are counted.
        // Total depth is logarithm of image size with block size as the base.
    };
    Render.prototype.readUnescapedCount = function () {
        var gl = this.gl;
        var buf = new Float32Array(4);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, buf);
        return buf[3];
    };
    Render.prototype.draw = function (keyFrame) {
        var width = keyFrame.width, height = keyFrame.height, view = keyFrame.view, mini = keyFrame.mini;
        var gl = this.gl;
        if (keyFrame.maxIterReached)
            return;
        var center = view.center.value;
        var x = center.real.valueOf();
        var y = center.imag.valueOf();
        var zoom = Math.pow(2, view.zoomExponent);
        if (width != this.width || height != this.height)
            this.resize(width, height);
        var sizeMin = Math.min(width, height);
        var sizeMax = Math.max(width, height);
        var xScale = width / sizeMin * 2;
        var yScale = height / sizeMin * 2;
        var data = new Float32Array(perturbStride * perturbStride * 4);
        var sample;
        var ptr = 0;
        // Calculate next reference orbit chunk.
        if (keyFrame.renderPassCount == 0) {
            // First chunk needs an extra step because the shader peeks ahead one iteration.
            ++mini.maxIterations;
            mini.restartOrbit();
            mini.updateOrbit();
            --mini.maxIterations;
        }
        else {
            // Prepend last iteration from the previous chunk because the shader still needs it.
            sample = mini.orbitChunk[mini.orbitChunkLen - 1] || {};
            data[ptr++] = sample.real;
            data[ptr++] = sample.imag;
            data[ptr++] = sample.dcReal;
            data[ptr++] = sample.dcImag;
            mini.updateOrbit();
        }
        // Encode reference orbit chunk into an input texture.
        for (var num = 0; num < mini.orbitChunkLen; ++num) {
            sample = mini.orbitChunk[num] || {};
            data[ptr++] = sample.real;
            data[ptr++] = sample.imag;
            data[ptr++] = sample.dcReal;
            data[ptr++] = sample.dcImag;
        }
        this.bindCalcShader(keyFrame.renderPassCount, data);
        xy32[0] = x;
        xy32[1] = y;
        var offset = view.toLocal(mini.referencePoint.real, mini.referencePoint.imag);
        gl.uniform2f(this.uCenterHi, xy32[0], xy32[1]);
        // gl.uniform2f(this.uCenterLo, x - xy32[0], y - xy32[1]);
        gl.uniform2f(this.uScale, xScale, yScale);
        gl.uniform1f(this.uSize, sizeMin / zoom);
        gl.uniform1f(this.uZoomCalc, zoom);
        gl.uniform1i(this.uIterCalc, keyFrame.renderPassCount * mini.maxIterations);
        gl.uniform2f(this.uReferenceOffset, -offset.x / width * sizeMin, -offset.y / height * sizeMin);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (keyFrame.renderPassCount % countInterval == 0) {
            this.updateUnescapedCount(keyFrame);
        }
        if (keyFrame.renderPassCount % readInterval == 0 && keyFrame.renderPassCount / countInterval >= Math.log(sizeMax) / Math.log(countBlockSize) + 1) {
            var escapedCount = this.readUnescapedCount();
            var escapedDelta = escapedCount - keyFrame.escapedCount;
            keyFrame.escapedCount = escapedCount;
            if (escapedDelta < width * height / 100 && keyFrame.minIterReached) {
                if (escapedDelta < 10)
                    keyFrame.maxIterReached = true;
                keyFrame.niceIterReached = true;
            }
            else if (escapedCount) {
                keyFrame.minIterReached = true;
            }
        }
        if (keyFrame.renderPassCount % renderInterval == 0) {
            this.bindColorShader(keyFrame.renderPassCount);
            gl.uniform1f(this.uZoomColor, zoom);
            gl.uniform1f(this.uTransparentColor, +!keyFrame.niceIterReached);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
        ++keyFrame.renderPassCount;
    };
    return Render;
}());
exports.Render = Render;
})
		], [
			/* fracts: 7 */
			"src/PeriodFinder.ts", ["cjs","js","ts"], {"./util": 3, "bigfloat": 0}, (function(GLOBAL, __dirname, __filename, exports, global, module, process, require) {
"use strict";
/*
    We wish to render a rectangular view of the Mandelbrot set. To speed up
    rendering using perturbation, a reference point with the highest (usually
    infinite) iteration count is needed. Any point inside the Mandelbrot set
    will work, but finding one using Newton-Raphson requires knowing its period.

    We can start iterating orbit points in sync at all corners of the
    rectangular view, and consider a quadrilateral connecting them.

    If the origin is inside the quad, then the orbit of some point with a
    parameter inside the view would have returned to the origin at the same
    iteration count [citation needed].

    Because all orbits start at the origin, it has returned to its initial
    state and repeats the same exact orbit with a period matching the
    iteration count when it first returned to the origin.

    By iterating further to find more iterations containing the origin, the
    periods of all minibrot cardioids (and possibly Misiurewicz points) in the
    view will be found [citation needed].

    A point in polygon test based on cross products determines if a
    quad contains the origin. If its edges cross a coordinate axis half
    (excluding zero) an odd number of times, the origin must be inside.
*/
Object.defineProperty(exports, "__esModule", { value: true });
var bigfloat_1 = require("bigfloat");
var util_1 = require("./util");
/** Temporary storage to avoid allocating memory while iterating. */
exports.tempComplex = new bigfloat_1.BigComplex32();
exports.zeroComplex = new bigfloat_1.BigComplex32();
/** Squared distances below epsilon are considered to be zero. */
var epsilon = Math.pow(2, -16);
var PeriodFinder = /** @class */ (function () {
    /** @param sw Bottom left corner complex coordinates.
      * @param ne Top right corner complex coordinates. */
    function PeriodFinder(sw, ne, options) {
        if (options === void 0) { options = {}; }
        /** Intermediate points for orbits with parameters at view corners. */
        this.samples = [];
        /** Complex coordinates of all view corner points. */
        this.corners = [];
        var bailOut = options.bailOut || 2;
        this.bailOut = bailOut;
        this.bailOut2 = bailOut * bailOut;
        this.maxPeriod = options.maxPeriod || 256;
        this.limbCount = options.limbCount || 2;
        /** Complex coordinates of all view corner points. */
        this.corners = [
            sw,
            new bigfloat_1.BigComplex32(sw.real, ne.imag),
            ne,
            new bigfloat_1.BigComplex32(ne.real, sw.imag)
        ];
        for (var num = 0; num < 4; ++num) {
            this.samples[num] = this.corners[num].clone();
        }
        this.period = 0;
    }
    /** Advance orbits with parameters at all corner points by one step. */
    PeriodFinder.prototype.getNextSamples = function () {
        var bailOut2 = this.bailOut2;
        var limbCount = this.limbCount;
        var samples = this.samples;
        var corners = this.corners;
        var sample;
        var real;
        var imag;
        var abs;
        var abs2;
        for (var num = 0; num < 4; ++num) {
            sample = samples[num];
            real = sample.real.valueOf();
            imag = sample.imag.valueOf();
            abs2 = real * real + imag * imag;
            if (abs2 > bailOut2) {
                // Simulate points escaping all the way to infinity by
                // normalizing them to the unit circle and setting c=0.
                abs = Math.sqrt(abs2);
                sample.real.setValue(real / abs);
                sample.imag.setValue(imag / abs);
                corners[num] = exports.zeroComplex;
            }
            // z = z^2 + c
            sample.sqr(exports.tempComplex).add(corners[num], sample).truncate(limbCount);
        }
        return samples;
    };
    /** Test if a quadrilateral defined by the sample points contains
      * the origin (0, 0) by counting crossings using signs of cross
      * products. Start with a positive sign, meaning an even number
      * of crossings. */
    PeriodFinder.prototype.nextContainsOrigin = function () {
        var samples = this.getNextSamples();
        var samplePrev;
        var real;
        var imag;
        var imagSignPrev;
        var sign = 1;
        var sample = samples[3];
        var realPrev = sample.real.valueOf();
        var imagPrev = sample.imag.valueOf();
        var imagSign = sample.imag.getSign();
        for (var num = 0; num < 4; ++num) {
            samplePrev = sample;
            sample = samples[num];
            real = sample.real.valueOf();
            imag = sample.imag.valueOf();
            imagSignPrev = imagSign;
            imagSign = sample.imag.getSign();
            // Assume point is at origin if very close.
            if (real * real + imag * imag < epsilon)
                return true;
            if (imagSign * imagSignPrev < 0) {
                // Get a corner point and delta to the next corner point,
                // forming an edge of the bounding quad.
                sample.sub(samplePrev, exports.tempComplex);
                var numer = realPrev * imag - imagPrev * real;
                realPrev = real;
                imagPrev = imag;
                real = exports.tempComplex.real.valueOf();
                imag = exports.tempComplex.imag.valueOf();
                // Assume line crosses origin if very close.
                if (numer * numer / (real * real + imag * imag) < epsilon)
                    return true;
                // Flip sign if the edge crosses one half of the real axis
                // (excluding zero). This may check for the positive or
                // negative half (depending on latest code changes).
                // Either one works, as long as all edges use the same check.
                sign *= (util_1.detSign(sample.real, sample.imag, exports.tempComplex.real, exports.tempComplex.imag) *
                    exports.tempComplex.imag.getSign()) || 1;
            }
            else {
                realPrev = real;
                imagPrev = imag;
            }
        }
        // If the final sign is negative, it must have been flipped an odd
        // number of times, meaning the orbit of some unknown point inside
        // this view just returned to the origin ending one period.
        return sign < 0;
    };
    /** Calculate next lowest Mandelbrot limit cycle period among points inside a
      * rectangle, using Robert Munafo's method based on the Jordan curve theorem.
      *
      * This will fail if no periodic points exist (no point in the view belongs
      * to the Mandelbrot set, making it pretty boring).
      *
      * @return Limit cycle period or 0 if none was found. */
    PeriodFinder.prototype.next = function () {
        var maxPeriod = this.maxPeriod;
        while (this.period++ < maxPeriod && !this.nextContainsOrigin())
            ;
        return this.period % (maxPeriod + 1);
    };
    return PeriodFinder;
}());
exports.PeriodFinder = PeriodFinder;
})
		], [
			/* fracts: 8 */
			"src/MinibrotFinder.ts", ["cjs","js","ts"], {"./PeriodFinder": 7, "./util": 3, "bigfloat": 0}, (function(GLOBAL, __dirname, __filename, exports, global, module, process, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bigfloat_1 = require("bigfloat");
var util_1 = require("./util");
var PeriodFinder_1 = require("./PeriodFinder");
function iterateMandelbrot(param, orbitState, maxIter, options, orbitChunk) {
    if (maxIter === void 0) { maxIter = 256; }
    if (options === void 0) { options = {}; }
    var real = orbitState.real, imag = orbitState.imag, dcReal = orbitState.dcReal, dcImag = orbitState.dcImag;
    var realParam = param.real;
    var imagParam = param.imag;
    var bailOut = options.bailOut || 2;
    /** Number of arbitrary precision limbs to use in calculations. */
    var limbCount = options.limbCount || 2;
    var real2 = real.mul(real).truncate(limbCount);
    var imag2 = imag.mul(imag).truncate(limbCount);
    var temp1 = util_1.tempFloats[0], temp2 = util_1.tempFloats[1], temp3 = util_1.tempFloats[2];
    var dNext = new bigfloat_1.BigFloat32();
    var one = new bigfloat_1.BigFloat32(1);
    var two = new bigfloat_1.BigFloat32(2);
    real = real.clone();
    imag = imag.clone();
    var bailOut2 = bailOut * bailOut;
    var iter = 0;
    while (iter < maxIter && real2.add(imag2, temp1).valueOf() < bailOut2) {
        if (orbitChunk) {
            var sample = orbitChunk[iter];
            sample.real = real.valueOf();
            sample.imag = imag.valueOf();
            sample.dcReal = dcReal.valueOf();
            sample.dcImag = dcImag.valueOf();
        }
        // dc = 2 * z * dc + 1
        // This grows larger at deeper zooms, so we always round
        // to only one fractional limb.
        real.mul(dcReal, temp1).sub(imag.mul(dcImag, temp2), temp3).truncate(1).mul(two, dNext);
        real.mul(dcImag, temp1).add(imag.mul(dcReal, temp2), temp3).truncate(1).mul(two, dcImag);
        dNext.add(one, dcReal);
        // z = z^2 + c
        real.mul(imag, temp1).truncate(limbCount).mul(two, temp2).add(imagParam, imag);
        real2.sub(imag2, temp1).add(realParam, real);
        real.mul(real, real2).truncate(limbCount);
        imag.mul(imag, imag2).truncate(limbCount);
        ++iter;
    }
    orbitState.real = real;
    orbitState.imag = imag;
    orbitState.dcReal = dcReal;
    orbitState.dcImag = dcImag;
    return iter;
}
exports.iterateMandelbrot = iterateMandelbrot;
var MinibrotFinder = /** @class */ (function () {
    function MinibrotFinder(center, sw, ne, zoomExponent, options) {
        this.center = center;
        this.sw = sw;
        this.ne = ne;
        this.zoomExponent = zoomExponent;
        /** Perturbation reference orbit parameter. */
        this.referencePoint = new bigfloat_1.BigComplex32();
        /** Latest <maxIterations> points on the reference orbit. */
        this.orbitChunk = [];
        this.maxIterations = options.maxIterations || 64;
        this.bailOut = options.bailOut || 256;
        this.maxPeriod = options.maxPeriod || 512;
        var size = Math.min(options.widthPixels || 1024, options.heightPixels || 1024);
        var bitsNeeded = Math.ceil(Math.log(size) / Math.log(2) - this.zoomExponent);
        var pixelSize = Math.pow(2, this.zoomExponent) / size;
        this.limbCount = (bitsNeeded >> 5) + 1 + 1;
        this.epsilon2 = pixelSize * pixelSize;
    }
    MinibrotFinder.prototype.find = function () {
        var _a = this, center = _a.center, sw = _a.sw, ne = _a.ne, epsilon2 = _a.epsilon2, referencePoint = _a.referencePoint;
        var periodFinder = new PeriodFinder_1.PeriodFinder(sw, ne, this);
        var tempComplex = new bigfloat_1.BigComplex32();
        var closestReference = center.clone();
        var closestDistance = Infinity;
        var closestPeriod = 0;
        var outsideCount = 0;
        var orbitChunk = [];
        // TODO: outsideCount limit is a random magic constant...
        while ((this.period = periodFinder.next()) && outsideCount < 32) {
            referencePoint.setValue(center);
            if (this.newtonStep()) {
                var real = referencePoint.real, imag = referencePoint.imag;
                if (real.deltaFrom(sw.real) > 0 &&
                    imag.deltaFrom(sw.imag) > 0 &&
                    real.deltaFrom(ne.real) < 0 &&
                    imag.deltaFrom(ne.imag) < 0) {
                    // Report point if it converged inside the view.
                    closestReference.setValue(referencePoint);
                    closestPeriod = this.period;
                    break;
                }
                else {
                    // Store this point if it's closer to the view center than
                    // the previous one was.
                    referencePoint.sub(center, tempComplex);
                    var deltaReal = tempComplex.real.valueOf();
                    var deltaImag = tempComplex.imag.valueOf();
                    var distance = deltaReal * deltaReal + deltaImag * deltaImag;
                    if (distance < closestDistance) {
                        closestReference.setValue(referencePoint);
                        closestDistance = distance;
                        closestPeriod = this.period;
                    }
                    ++outsideCount;
                }
            }
        }
        referencePoint.setValue(closestReference);
        this.period = closestPeriod;
        var limbCount = this.limbCount;
        var i;
        // Increase precision and refine estimate until reference orbit no longer escapes.
        // TODO: loop max count is a random magic constant...
        // TODO: need size estimate to verify point is inside the minibrot!
        for (i = 0; i < 100; ++i) {
            this.epsilon2 /= 65536 * 65536;
            limbCount += 0.5;
            this.limbCount = ~~(limbCount + 0.5);
            // TODO: replace arbitrary multiplication and this entire test by using size estimate.
            this.maxIterations *= 32;
            this.restartOrbit();
            var debug = this.updateOrbit();
            this.maxIterations /= 32;
            if (debug >= this.maxIterations * 32) {
                break;
            }
        }
        if (i == 100)
            debugger;
    };
    MinibrotFinder.prototype.restartOrbit = function () {
        // TODO: use setValue on component BigFloats instead.
        this.orbitState = {
            real: this.referencePoint.real,
            imag: this.referencePoint.imag,
            dcReal: new bigfloat_1.BigFloat32(1),
            dcImag: new bigfloat_1.BigFloat32(0)
        };
        // Initialize empty reference orbit chunk.
        for (var iter = 0; iter < this.maxIterations; ++iter) {
            this.orbitChunk[iter] = {
                real: 0,
                imag: 0,
                dcReal: 0,
                dcImag: 0
            };
        }
    };
    MinibrotFinder.prototype.updateOrbit = function () {
        this.orbitChunkLen = iterateMandelbrot(this.referencePoint, this.orbitState, this.maxIterations, this, this.orbitChunk);
        return this.orbitChunkLen;
    };
    MinibrotFinder.prototype.newtonStep = function () {
        var temp1 = util_1.tempFloats[0], temp2 = util_1.tempFloats[1], temp3 = util_1.tempFloats[2];
        var _a = this, period = _a.period, referencePoint = _a.referencePoint, epsilon2 = _a.epsilon2, view = _a.view;
        var tempComplex = new bigfloat_1.BigComplex32();
        var orbitState = {
            real: new bigfloat_1.BigFloat32(),
            imag: new bigfloat_1.BigFloat32(),
            dcReal: new bigfloat_1.BigFloat32(),
            dcImag: new bigfloat_1.BigFloat32()
        };
        var step;
        for (step = 0; step < 64; ++step) {
            orbitState.real.setValue(referencePoint.real);
            orbitState.imag.setValue(referencePoint.imag);
            orbitState.dcReal.setValue(1);
            orbitState.dcImag.setValue(0);
            try {
                iterateMandelbrot(referencePoint, orbitState, period, this);
            }
            catch (err) {
                debugger;
            }
            var real = orbitState.real, imag = orbitState.imag, dcReal = orbitState.dcReal, dcImag = orbitState.dcImag;
            var dMag2 = dcReal.mul(dcReal, temp1).add(dcImag.mul(dcImag, temp2), temp3).valueOf(); //  * 2;
            var deltaReal = real.mul(dcReal, temp1).add(imag.mul(dcImag, temp2), temp3).valueOf() / dMag2;
            var deltaImag = imag.mul(dcReal, temp1).sub(real.mul(dcImag, temp2), temp3).valueOf() / dMag2;
            if (deltaReal * deltaReal + deltaImag * deltaImag < epsilon2) {
                break;
            }
            referencePoint.real.sub(deltaReal, tempComplex.real);
            referencePoint.imag.sub(deltaImag, tempComplex.imag);
            referencePoint.setValue(tempComplex.truncate(this.limbCount));
        }
        var _b = view.toLocal(referencePoint.real, referencePoint.imag), x = _b.x, y = _b.y;
        return step < 64;
    };
    return MinibrotFinder;
}());
exports.MinibrotFinder = MinibrotFinder;
})
		], [
			/* fracts: 9 */
			"src/KeyFrame.ts", ["cjs","js","ts"], {"./MinibrotFinder": 8}, (function(GLOBAL, __dirname, __filename, exports, global, module, process, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var MinibrotFinder_1 = require("./MinibrotFinder");
/** Represents a view of the Mandelbrot fractal with a center point and zoom.
  * From them, a suitable permutation reference orbit location is calculated.
  * The full reference orbit can be retrieved in chunks for iteratively
  * producing an image of the fractal. */
var KeyFrame = /** @class */ (function () {
    function KeyFrame(view, options) {
        if (options === void 0) { options = {}; }
        this.renderPassCount = 0;
        this.minIterReached = false;
        this.niceIterReached = false;
        this.maxIterReached = false;
        this.escapedCount = -1;
        this.view = view.clone();
        this.width = options.widthPixels || 1024;
        this.height = options.heightPixels || 1024;
        var size = Math.min(this.width, this.height);
        /** Horizontal scale compared to a square-shaped view.
          * Equals aspect ratio (width / height) for landscape orientation, 1 for portrait. */
        var scaleReal = this.width / size * 2;
        /** Vertical scale compared to a square-shaped view.
          * Equals aspect ratio (height / width) for portrait orientation, 1 for landscape. */
        var scaleImag = this.height / size * 2;
        this.mini = new MinibrotFinder_1.MinibrotFinder(view.center.value, view.toGlobal(-scaleReal, -scaleImag), view.toGlobal(scaleReal, scaleImag), view.zoomExponent, options);
        this.mini.view = view;
        this.mini.find();
    }
    return KeyFrame;
}());
exports.KeyFrame = KeyFrame;
})
		], [
			/* fracts: 10 */
			"src/History.ts", ["cjs","js","ts"], {"bigfloat": 0, "classy-mst": 1, "mobx": 20, "mobx-state-tree": 21}, (function(GLOBAL, __dirname, __filename, exports, global, module, process, require) {
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var mobx_state_tree_1 = require("mobx-state-tree");
var classy_mst_1 = require("classy-mst");
var bigfloat_1 = require("bigfloat");
var mobx_1 = require("mobx");
exports.zeroComplex = new bigfloat_1.BigComplex32();
var tempFloat = new bigfloat_1.BigFloat32();
var ComplexData = mobx_state_tree_1.types.model({
    value: mobx_state_tree_1.types.frozen(exports.zeroComplex)
}).preProcessSnapshot(function (_a) {
    var real = _a.real, imag = _a.imag;
    return ({
        value: new bigfloat_1.BigComplex32(real, imag, 16)
    });
}).postProcessSnapshot(function (_a) {
    var value = _a.value;
    return ({
        real: value.real.toString(16),
        imag: value.imag.toString(16)
    });
});
var ComplexCode = /** @class */ (function (_super) {
    __extends(ComplexCode, _super);
    function ComplexCode() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ComplexCode.prototype.setValue = function (value) {
        this.value = value;
    };
    __decorate([
        classy_mst_1.action
    ], ComplexCode.prototype, "setValue", null);
    return ComplexCode;
}(classy_mst_1.shim(ComplexData)));
exports.Complex = classy_mst_1.mst(ComplexCode, ComplexData, 'Todo');
var ViewData = mobx_state_tree_1.types.model({
    center: exports.Complex,
    zoomExponent: mobx_state_tree_1.types.number
});
var ViewCode = /** @class */ (function (_super) {
    __extends(ViewCode, _super);
    function ViewCode() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /** Get complex coordinates from local view coordinates.
      *
      * Local coordinate origin is at the view center and nearest edges
      * are one unit away from it.
      * This matches a WebGL viewport but with uniform scaling.
      *
      * @param x Local horizontal coordinate from -1 (left) to 1 (right edge)
      * for portrait orientation, otherwise unlimited.
      * @param y Local vertical coordinate from -1 (bottom) to 1 (top edge)
      * for landscape orientation, otherwise unlimited.
      * @return Complex coordinates matching given local coordinates. */
    ViewCode.prototype.toGlobal = function (x, y) {
        var scale = Math.pow(2, this.zoomExponent + 1);
        var center = this.center.value;
        return (new bigfloat_1.BigComplex32(center.real.add(x * scale), center.imag.add(y * scale)));
    };
    ViewCode.prototype.toLocal = function (real, imag) {
        var scale = Math.pow(2, this.zoomExponent + 1);
        var center = this.center.value;
        return ({
            x: real.sub(center.real, tempFloat).valueOf() / scale,
            y: imag.sub(center.imag, tempFloat).valueOf() / scale
        });
    };
    ViewCode.prototype.reset = function (x, y, z) {
        this.center.setValue(new bigfloat_1.BigComplex32(x, y));
        this.zoomExponent = z;
    };
    /** Zoom view towards (x, y) in local coordinates.
      *
      * Complex coordinates at local (x, y) coordinates remain constant.
      *
      * @param x Horizontal coordinate from -1 (left) to 1 (right edge).
      * @param y Vertical coordinate from -1 (bottom) to 1 (top edge).
      * @param amount Zoom exponent offset, 1 zooms to quadrant size. */
    ViewCode.prototype.zoomTo = function (x, y, amount) {
        var scale = 1 - Math.pow(2, amount);
        this.center.setValue(this.toGlobal(x * scale, y * scale));
        this.zoomExponent += amount;
    };
    ViewCode.prototype.clone = function () {
        return (mobx_state_tree_1.clone(this));
    };
    __decorate([
        classy_mst_1.action
    ], ViewCode.prototype, "reset", null);
    __decorate([
        classy_mst_1.action
    ], ViewCode.prototype, "zoomTo", null);
    return ViewCode;
}(classy_mst_1.shim(ViewData)));
exports.View = classy_mst_1.mst(ViewCode, ViewData, 'View');
/** querystring.parse equivalent that outputs keys in lowercase.
  * @param query Request URL including query string.
  * @param pos Index of one past the ? character signaling start of parameters. */
function parseQuery(query, pos) {
    if (pos === void 0) { pos = query.indexOf('?') + 1 || query.length; }
    var paramTbl = {};
    do {
        var posKey = pos;
        var posArg = query.indexOf('=', pos) + 1;
        pos = query.indexOf('&', pos) + 1;
        var posEnd = pos || query.length + 1;
        if (posArg && posArg < posEnd) {
            var key = decodeURIComponent(query.substr(posKey, posArg - posKey - 1)).toLowerCase();
            if (key.match(/^[a-z]+$/)) {
                var val = decodeURIComponent(query.substr(posArg, posEnd - posArg - 1));
                paramTbl[key] = val;
            }
        }
    } while (pos);
    return (paramTbl);
}
exports.parseQuery = parseQuery;
function formatQuery(paramTbl) {
    return (Object.keys(paramTbl).sort().map(function (key) { return encodeURIComponent(key) + '=' + encodeURIComponent('' + paramTbl[key]); }).join('&'));
}
exports.formatQuery = formatQuery;
var State = /** @class */ (function () {
    function State() {
        var _this = this;
        this.origin = window.location.origin || ((location.protocol.replace(/:$/, '') || 'http') +
            '://' +
            location.host +
            (location.port ? ':' + location.port : ''));
        this.path = location.pathname;
        var _a = parseQuery(location.search), real = _a.real, imag = _a.imag, zoom = _a.zoom;
        this.view = exports.View.create({
            center: {
                real: real || 0,
                imag: imag || 0
            },
            zoomExponent: +zoom || 0
        });
        mobx_1.autorun(function () {
            var _a = mobx_state_tree_1.getSnapshot(_this.view), _b = _a.center, real = _b.real, imag = _b.imag, zoom = _a.zoomExponent;
            _this.update(formatQuery({ real: real, imag: imag, zoom: zoom }));
        });
    }
    State.prototype.update = function (query) {
        if (window.history && window.history.replaceState) {
            var url = this.origin + this.path + '?' + query;
            window.history.replaceState(null, document.title, url);
        }
    };
    return State;
}());
exports.State = State;
})
		], [
			/* fracts: 11 */
			"index.html", ["cjs","js","html"], {"./bundle.js": 18, "./src/index.ts": 4}, (function(GLOBAL, __dirname, __filename, exports, global, module, process, require) {
require("./src/index.ts");
require("./bundle.js");

})
		], [
			/* fracts: 12 */
			"glsl/count.vert", ["txt"], {}, "precision highp float;\n\nattribute vec2 aPos;\n\nvarying vec2 vPos;\n\nconst float scale = BLOCK_SIZE;\n\nvoid main() {\n\tgl_Position = vec4(\n\t\t(aPos + 1.0) / scale - 1.0,\n\t\t0.0,\n\t\t1.0\n\t);\n\tvPos = (aPos + 1.0) * 0.5;\n}\n"
		], [
			/* fracts: 13 */
			"glsl/count.frag", ["txt"], {}, "#extension GL_EXT_draw_buffers : require\n\nprecision highp float;\n\nuniform sampler2D uData;\nuniform vec2 uSize;\nuniform int uIter;\n\nvarying vec2 vPos;\n\nconst float scale = BLOCK_SIZE;\n\nvoid main() {\n\tfloat sum = 0.0;\n\n\tif(uIter > 0) {\n\t\t// Disregard old data in block bottom left pixel by negating it.\n\t\tsum = -texture2D(uData, vPos - (scale * 0.5 - 0.5) / uSize).w;\n\n\t\tfor(float y = 0.0; y < scale; ++y) {\n\t\t\tfor(float x = 0.0; x < scale; ++x) {\n\t\t\t\tsum += texture2D(uData, vPos + (vec2(x, y) - (scale * 0.5 - 0.5)) / uSize).w;\n\t\t\t}\n\t\t}\n\t}\n\n\tgl_FragData[0].w = sum;\n}\n"
		], [
			/* fracts: 14 */
			"glsl/colorize.vert", ["txt"], {}, "precision highp float;\n\nattribute vec2 aPos;\n\nvarying vec2 vPos;\n\nvoid main() {\n\tgl_Position = vec4(aPos, 0.0, 1.0);\n\tvPos = aPos;\n}\n"
		], [
			/* fracts: 15 */
			"glsl/colorize.frag", ["txt"], {}, "precision highp float;\n\nuniform float uZoom;\nuniform sampler2D uOrbit;\nuniform sampler2D uData;\nuniform float uTransparent;\n\nvarying vec2 vPos;\n\nconst float INVPI = 0.318309886183790671537767526745;\n\nconst float gridWidth = 0.125;\nconst float gridAlpha = 1.0 / 16.0;\n\nconst float bailOut = 256.0;\nconst float bailOut2 = bailOut * bailOut;\nconst float logBailOut2 = log(bailOut) * 2.0;\n\nconst float dwellEdge = log(bailOut) * (4.0 - gridWidth);\nconst float phaseEdge = gridWidth / 64.0 * logBailOut2 / log(2.0);\n\n// Scaling factor to avoid overflow of intermediate values in complex number magnitude calculations.\nconst float magnitudeScale = pow(2.0, -62.0) / bailOut;\nconst float logMagnitudeScale = log(4.0) * 62.0 + logBailOut2;\n\n// Fast branchless color space conversion from HSL to RGB.\n\nconst vec3 hueOffset = vec3(0.0, 2.0, 1.0) / 3.0;\n\nvec3 hsl2rgb(float h, float s, float l) {\n\ts -= s * abs(l * 2.0 - 1.0);\n\n\treturn(clamp(\n\t\tabs(fract(h + hueOffset) - 0.5) * 6.0 - 1.5,\n\t\t-0.5,\n\t\t0.5\n\t) * s + l);\n}\n\nvoid main() {\n\tvec2 uv = (vPos + 1.0) * 0.5;\n\tvec4 z = texture2D(uOrbit, uv);\n\tvec4 data = texture2D(uData, uv);\n\tint iter = int(data.x);\n\tint period = int(data.y);\n\n\tvec4 zs = z * magnitudeScale;\n\tvec2 logMagnitude = max(log(zs.xz * zs.xz + zs.yw * zs.yw) + logMagnitudeScale, 0.0);\n\n\tfloat dist = logMagnitude.x * exp((logMagnitude.x - logMagnitude.y) * 0.5);\n\tfloat arg = atan(z.y, z.x) * INVPI;\n\tfloat fraction = logMagnitude.x / logBailOut2;\n\n\tfloat dwell = float(iter);\n\tfloat smoothDwell = dwell + 2.0 - fraction;\n\n\tfloat isEdge = 1.0 - (\n\t\tstep(\n\t\t\tlogMagnitude.x,\n\t\t\tdwellEdge\n\t\t) * step(\n\t\t\tabs(abs(arg) - 0.5),\n\t\t\t0.5 - phaseEdge * fraction\n\t\t)\n\t);\n\n\tfloat inside = step(dwell, 0.0);\n\n\tgl_FragColor = vec4(hsl2rgb(\n\t\tmix(\n\t\t\tlog(smoothDwell) / 4.0, // Hue\n\t\t\tfloat(period) / 31.0,\n\t\t\tinside\n\t\t),\n\t\t0.5,\n\t\tmix( // Lightness is...\n\t\t\t// outside the set, cube root of distance estimate multiplied by...\n\t\t\tmin(pow(dist / uZoom, 1.0 / 3.0) * 4.0 + 0.25, 1.0) * (\n\t\t\t\t// Base lightness offset by...\n\t\t\t\t0.5 +\n\t\t\t\t// Binary decomposition grid lines and odd cell interiors.\n\t\t\t\t(step(z.y, 0.0) * (1.0 - isEdge) - isEdge) * gridAlpha\n\t\t\t),\n\t\t\t// Inside the set, use constant lightness.\n\t\t\t0.75,\n\t\t\tinside\n\t\t)\n\t), 1.0) * mix(1.0, 0.0, inside * uTransparent);\n}\n"
		], [
			/* fracts: 16 */
			"glsl/calculate.vert", ["txt"], {}, "precision highp float;\n\nattribute vec2 aPos;\n\nvarying vec2 vPos;\n\nvoid main() {\n\tgl_Position = vec4(aPos, 0.0, 1.0);\n\tvPos = aPos;\n}\n"
		], [
			/* fracts: 17 */
			"glsl/calculate.frag", ["txt"], {}, "#extension GL_EXT_draw_buffers : require\n\nprecision highp float;\n\nuniform vec2 uReferenceOffset;\nuniform vec2 uCenterHi;\nuniform vec2 uScale;\nuniform float uSize;\nuniform float uZoom;\nuniform int uIter;\nuniform sampler2D uExact;\nuniform sampler2D uOrbit;\nuniform sampler2D uData;\n\nvarying vec2 vPos;\n\nconst int maxIter = 64 * 2;\nconst int perturbStride = 256;\n\nconst float bailOut = 256.0;\nconst float bailOut2 = bailOut * bailOut;\n\nconst float limit1 = pow(2.0, 24.0);\n\nconst vec4 v1122 = vec4( 1.0, 1.0,  2.0, 2.0);\nconst vec4 va1b2 = vec4(-1.0, 1.0, -2.0, 2.0);\nconst vec4 v2211 = vec4( 2.0, 2.0,  1.0, 1.0);\nconst vec2 zero2 = vec2(0.0);\nconst vec4 zero4 = vec4(0.0);\n\n// At shallowest zoom depths,\n// use highp floats (should be IEEE 754 single precision).\n\nint mandelSingle(vec4 init, inout vec4 z, inout float distMin, inout int period) {\n\tfor(int iter = 0; iter < maxIter; ++iter) {\n\t\tvec4 a = z      * z.x * v1122;\n\t\tvec4 b = z.yxwz * z.y * va1b2;\n\n\t\tfloat dist = a.x - b.x;\n\n\t\tif(dist < distMin) {\n\t\t\tperiod = uIter + iter;\n\t\t\tdistMin = dist;\n\t\t} else if(dist > bailOut2) {\n\t\t\treturn(uIter + iter);\n\t\t}\n\n\t\tz = a + b + init;\n\t}\n\n\treturn(0);\n}\n\n// Use perturbation for deeper zooms.\n\nint mandelPerturb(vec4 init, inout vec4 z, inout float distMin, inout int period) {\n\tvec4 exact = texture2D(uExact, (zero2 + 0.5) / float(perturbStride));\n\n\tfor(int iter = 1; iter <= maxIter; ++iter) {\n\t\tvec4 total = z + exact * v2211;\n\n\t\tz = (init +\n\t\t\tz.x  * total   * v1122    + z.y  * total.yxwz * va1b2 + vec4(zero2,\n\t\t\tz.zw * exact.x * v1122.zw + z.wz * exact.y    * va1b2.zw\n\t\t));\n\n\t\tint y = iter / perturbStride;\n\t\texact = texture2D(uExact, (vec2(iter - y * perturbStride, y) + 0.5) / float(perturbStride));\n\n\t\tfloat dist = dot(z.xy + exact.xy, z.xy + exact.xy);\n\n\t\tif(dist < distMin) {\n\t\t\tperiod = uIter + iter;\n\t\t\tdistMin = dist;\n\t\t} else if(dist > bailOut2) {\n\t\t\tz += exact;\n\t\t\treturn(uIter + iter);\n\t\t}\n\t}\n\n\treturn(0);\n}\n\nvoid main() {\n\tvec4 init = vec4((vPos + uReferenceOffset) * uZoom * uScale, zero2);\n\tvec2 uv = (vPos + 1.0) * 0.5;\n\tvec4 z = texture2D(uOrbit, uv);\n\tvec4 data = texture2D(uData, uv);\n\tint period = int(data.y);\n\tfloat distMin = data.z;\n\tfloat count = data.w;\n\nif(uSize < limit1) init = vec4(uCenterHi + vPos * uZoom * uScale, 1.0, 0.0);\n\n\tif(uIter == 0) {\n\t\tz = init;\n\t\tperiod = 0;\n\t\tdistMin = bailOut2;\n\t\tcount = 0.0;\n\t} else if(data.x != 0.0) {\n\t\tgl_FragData[1] = z;\n\t\tgl_FragData[0] = data;\n\t\treturn;\n\t}\n\n\tint iter;\n\n\tif(uSize < limit1) {\n\t\titer = mandelSingle(init, z, distMin, period);\n\t} else {\n\t\titer = mandelPerturb(init, z, distMin, period);\n\t}\n\n\tgl_FragData[1] = z;\n\tgl_FragData[0] = vec4( float(iter), float(period), distMin, count + 1.0 - step(float(iter), 0.0) );\n}\n"
		], [
			/* fracts: 18 */
			"bundle.js", ["js"], {}, (function(process) {

})
		]
	]
}, {
	name: "mobx",
	version: "4.15.4",
	root: "node_modules/mobx",
	main: "lib/index.js",
	files: [
		[
			/* mobx: 19 */
			"lib/mobx.js", ["cjs","js"], {}, (function(GLOBAL, __dirname, __filename, exports, global, module, process, require) {
/** MobX - (c) Michel Weststrate 2015 - 2020 - MIT Licensed */
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

function __read(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
}

function __spread() {
    for (var ar = [], i = 0; i < arguments.length; i++)
        ar = ar.concat(__read(arguments[i]));
    return ar;
}

var OBFUSCATED_ERROR = "An invariant failed, however the error is obfuscated because this is an production build.";
var EMPTY_ARRAY = [];
Object.freeze(EMPTY_ARRAY);
var EMPTY_OBJECT = {};
Object.freeze(EMPTY_OBJECT);
var mockGlobal = {};
function getGlobal() {
    if (typeof window !== "undefined") {
        return window;
    }
    if (typeof global !== "undefined") {
        return global;
    }
    if (typeof self !== "undefined") {
        return self;
    }
    return mockGlobal;
}
function getNextId() {
    return ++globalState.mobxGuid;
}
function fail(message) {
    invariant(false, message);
    throw "X"; // unreachable
}
function invariant(check, message) {
    if (!check)
        throw new Error("[mobx] " + (message || OBFUSCATED_ERROR));
}
/**
 * Prints a deprecation message, but only one time.
 * Returns false if the deprecated message was already printed before
 */
var deprecatedMessages = [];
function deprecated(msg, thing) {
    if (thing) {
        return deprecated("'" + msg + "', use '" + thing + "' instead.");
    }
    if (deprecatedMessages.indexOf(msg) !== -1)
        return false;
    deprecatedMessages.push(msg);
    console.error("[mobx] Deprecated: " + msg);
    return true;
}
/**
 * Makes sure that the provided function is invoked at most once.
 */
function once(func) {
    var invoked = false;
    return function () {
        if (invoked)
            return;
        invoked = true;
        return func.apply(this, arguments);
    };
}
var noop = function () { };
function unique(list) {
    var res = [];
    list.forEach(function (item) {
        if (res.indexOf(item) === -1)
            res.push(item);
    });
    return res;
}
function isObject(value) {
    return value !== null && typeof value === "object";
}
function isPlainObject(value) {
    if (value === null || typeof value !== "object")
        return false;
    var proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}
function convertToMap(dataStructure) {
    if (isES6Map(dataStructure) || isObservableMap(dataStructure)) {
        return dataStructure;
    }
    else if (Array.isArray(dataStructure)) {
        return new Map(dataStructure);
    }
    else if (isPlainObject(dataStructure)) {
        return new Map(Object.entries(dataStructure));
    }
    else {
        return fail("Cannot convert to map from '" + dataStructure + "'");
    }
}
function makeNonEnumerable(object, propNames) {
    for (var i = 0; i < propNames.length; i++) {
        addHiddenProp(object, propNames[i], object[propNames[i]]);
    }
}
function addHiddenProp(object, propName, value) {
    Object.defineProperty(object, propName, {
        enumerable: false,
        writable: true,
        configurable: true,
        value: value
    });
}
function addHiddenFinalProp(object, propName, value) {
    Object.defineProperty(object, propName, {
        enumerable: false,
        writable: false,
        configurable: true,
        value: value
    });
}
function isPropertyConfigurable(object, prop) {
    var descriptor = Object.getOwnPropertyDescriptor(object, prop);
    return !descriptor || (descriptor.configurable !== false && descriptor.writable !== false);
}
function assertPropertyConfigurable(object, prop) {
    if (!isPropertyConfigurable(object, prop))
        fail("Cannot make property '" + prop + "' observable, it is not configurable and writable in the target object");
}
function createInstanceofPredicate(name, clazz) {
    var propName = "isMobX" + name;
    clazz.prototype[propName] = true;
    return function (x) {
        return isObject(x) && x[propName] === true;
    };
}
function areBothNaN(a, b) {
    return typeof a === "number" && typeof b === "number" && isNaN(a) && isNaN(b);
}
/**
 * Returns whether the argument is an array, disregarding observability.
 */
function isArrayLike(x) {
    return Array.isArray(x) || isObservableArray(x);
}
function isES6Map(thing) {
    if (getGlobal().Map !== undefined && thing instanceof getGlobal().Map)
        return true;
    return false;
}
function isES6Set(thing) {
    return thing instanceof Set;
}
// use Array.from in Mobx 5
function iteratorToArray(it) {
    var res = [];
    while (true) {
        var r = it.next();
        if (r.done)
            break;
        res.push(r.value);
    }
    return res;
}
function primitiveSymbol() {
    // es-disable-next-line
    return (typeof Symbol === "function" && Symbol.toPrimitive) || "@@toPrimitive";
}
function toPrimitive(value) {
    return value === null ? null : typeof value === "object" ? "" + value : value;
}

function iteratorSymbol() {
    return (typeof Symbol === "function" && Symbol.iterator) || "@@iterator";
}
function declareIterator(prototType, iteratorFactory) {
    addHiddenFinalProp(prototType, iteratorSymbol(), iteratorFactory);
}
function makeIterable(iterator) {
    iterator[iteratorSymbol()] = getSelf;
    return iterator;
}
function toStringTagSymbol() {
    return (typeof Symbol === "function" && Symbol.toStringTag) || "@@toStringTag";
}
function getSelf() {
    return this;
}

/**
 * Anything that can be used to _store_ state is an Atom in mobx. Atoms have two important jobs
 *
 * 1) detect when they are being _used_ and report this (using reportObserved). This allows mobx to make the connection between running functions and the data they used
 * 2) they should notify mobx whenever they have _changed_. This way mobx can re-run any functions (derivations) that are using this atom.
 */
var Atom = /** @class */ (function () {
    /**
     * Create a new atom. For debugging purposes it is recommended to give it a name.
     * The onBecomeObserved and onBecomeUnobserved callbacks can be used for resource management.
     */
    function Atom(name) {
        if (name === void 0) { name = "Atom@" + getNextId(); }
        this.name = name;
        this.isPendingUnobservation = false; // for effective unobserving. BaseAtom has true, for extra optimization, so its onBecomeUnobserved never gets called, because it's not needed
        this.isBeingObserved = false;
        this.observers = [];
        this.observersIndexes = {};
        this.diffValue = 0;
        this.lastAccessedBy = 0;
        this.lowestObserverState = exports.IDerivationState.NOT_TRACKING;
    }
    Atom.prototype.onBecomeUnobserved = function () {
        // noop
    };
    Atom.prototype.onBecomeObserved = function () {
        /* noop */
    };
    /**
     * Invoke this method to notify mobx that your atom has been used somehow.
     * Returns true if there is currently a reactive context.
     */
    Atom.prototype.reportObserved = function () {
        return reportObserved(this);
    };
    /**
     * Invoke this method _after_ this method has changed to signal mobx that all its observers should invalidate.
     */
    Atom.prototype.reportChanged = function () {
        startBatch();
        propagateChanged(this);
        endBatch();
    };
    Atom.prototype.toString = function () {
        return this.name;
    };
    return Atom;
}());
var isAtom = createInstanceofPredicate("Atom", Atom);
function createAtom(name, onBecomeObservedHandler, onBecomeUnobservedHandler) {
    if (onBecomeObservedHandler === void 0) { onBecomeObservedHandler = noop; }
    if (onBecomeUnobservedHandler === void 0) { onBecomeUnobservedHandler = noop; }
    var atom = new Atom(name);
    onBecomeObserved(atom, onBecomeObservedHandler);
    onBecomeUnobserved(atom, onBecomeUnobservedHandler);
    return atom;
}

function identityComparer(a, b) {
    return a === b;
}
function structuralComparer(a, b) {
    return deepEqual(a, b);
}
function shallowComparer(a, b) {
    return deepEqual(a, b, 1);
}
function defaultComparer(a, b) {
    return areBothNaN(a, b) || identityComparer(a, b);
}
var comparer = {
    identity: identityComparer,
    structural: structuralComparer,
    default: defaultComparer,
    shallow: shallowComparer
};

var enumerableDescriptorCache = {};
var nonEnumerableDescriptorCache = {};
function createPropertyInitializerDescriptor(prop, enumerable) {
    var cache = enumerable ? enumerableDescriptorCache : nonEnumerableDescriptorCache;
    return (cache[prop] ||
        (cache[prop] = {
            configurable: true,
            enumerable: enumerable,
            get: function () {
                initializeInstance(this);
                return this[prop];
            },
            set: function (value) {
                initializeInstance(this);
                this[prop] = value;
            }
        }));
}
function initializeInstance(target) {
    if (target.__mobxDidRunLazyInitializers === true)
        return;
    var decorators = target.__mobxDecorators;
    if (decorators) {
        addHiddenProp(target, "__mobxDidRunLazyInitializers", true);
        for (var key in decorators) {
            var d = decorators[key];
            d.propertyCreator(target, d.prop, d.descriptor, d.decoratorTarget, d.decoratorArguments);
        }
    }
}
function createPropDecorator(propertyInitiallyEnumerable, propertyCreator) {
    return function decoratorFactory() {
        var decoratorArguments;
        var decorator = function decorate(target, prop, descriptor, applyImmediately
        // This is a special parameter to signal the direct application of a decorator, allow extendObservable to skip the entire type decoration part,
        // as the instance to apply the decorator to equals the target
        ) {
            if (applyImmediately === true) {
                propertyCreator(target, prop, descriptor, target, decoratorArguments);
                return null;
            }
            if (!quacksLikeADecorator(arguments))
                fail("This function is a decorator, but it wasn't invoked like a decorator");
            if (!Object.prototype.hasOwnProperty.call(target, "__mobxDecorators")) {
                var inheritedDecorators = target.__mobxDecorators;
                addHiddenProp(target, "__mobxDecorators", __assign({}, inheritedDecorators));
            }
            target.__mobxDecorators[prop] = {
                prop: prop,
                propertyCreator: propertyCreator,
                descriptor: descriptor,
                decoratorTarget: target,
                decoratorArguments: decoratorArguments
            };
            return createPropertyInitializerDescriptor(prop, propertyInitiallyEnumerable);
        };
        if (quacksLikeADecorator(arguments)) {
            // @decorator
            decoratorArguments = EMPTY_ARRAY;
            return decorator.apply(null, arguments);
        }
        else {
            // @decorator(args)
            decoratorArguments = Array.prototype.slice.call(arguments);
            return decorator;
        }
    };
}
function quacksLikeADecorator(args) {
    return (((args.length === 2 || args.length === 3) && typeof args[1] === "string") ||
        (args.length === 4 && args[3] === true));
}

function deepEnhancer(v, _, name) {
    // it is an observable already, done
    if (isObservable(v))
        return v;
    // something that can be converted and mutated?
    if (Array.isArray(v))
        return observable.array(v, { name: name });
    if (isPlainObject(v))
        return observable.object(v, undefined, { name: name });
    if (isES6Map(v))
        return observable.map(v, { name: name });
    if (isES6Set(v))
        return observable.set(v, { name: name });
    return v;
}
function shallowEnhancer(v, _, name) {
    if (v === undefined || v === null)
        return v;
    if (isObservableObject(v) || isObservableArray(v) || isObservableMap(v) || isObservableSet(v))
        return v;
    if (Array.isArray(v))
        return observable.array(v, { name: name, deep: false });
    if (isPlainObject(v))
        return observable.object(v, undefined, { name: name, deep: false });
    if (isES6Map(v))
        return observable.map(v, { name: name, deep: false });
    if (isES6Set(v))
        return observable.set(v, { name: name, deep: false });
    return fail("The shallow modifier / decorator can only used in combination with arrays, objects, maps and sets");
}
function referenceEnhancer(newValue) {
    // never turn into an observable
    return newValue;
}
function refStructEnhancer(v, oldValue, name) {
    if (isObservable(v))
        throw "observable.struct should not be used with observable values";
    if (deepEqual(v, oldValue))
        return oldValue;
    return v;
}

function createDecoratorForEnhancer(enhancer) {
    invariant(enhancer);
    var decorator = createPropDecorator(true, function (target, propertyName, descriptor, _decoratorTarget, decoratorArgs) {
        {
            invariant(!descriptor || !descriptor.get, "@observable cannot be used on getter (property \"" + propertyName + "\"), use @computed instead.");
        }
        var initialValue = descriptor
            ? descriptor.initializer
                ? descriptor.initializer.call(target)
                : descriptor.value
            : undefined;
        defineObservableProperty(target, propertyName, initialValue, enhancer);
    });
    var res = 
    // Extra process checks, as this happens during module initialization
    typeof process !== "undefined" && process.env && "development" !== "production"
        ? function observableDecorator() {
            // This wrapper function is just to detect illegal decorator invocations, deprecate in a next version
            // and simply return the created prop decorator
            if (arguments.length < 2)
                return fail("Incorrect decorator invocation. @observable decorator doesn't expect any arguments");
            return decorator.apply(null, arguments);
        }
        : decorator;
    res.enhancer = enhancer;
    return res;
}

// Predefined bags of create observable options, to avoid allocating temporarily option objects
// in the majority of cases
var defaultCreateObservableOptions = {
    deep: true,
    name: undefined,
    defaultDecorator: undefined
};
var shallowCreateObservableOptions = {
    deep: false,
    name: undefined,
    defaultDecorator: undefined
};
Object.freeze(defaultCreateObservableOptions);
Object.freeze(shallowCreateObservableOptions);
function assertValidOption(key) {
    if (!/^(deep|name|equals|defaultDecorator)$/.test(key))
        fail("invalid option for (extend)observable: " + key);
}
function asCreateObservableOptions(thing) {
    if (thing === null || thing === undefined)
        return defaultCreateObservableOptions;
    if (typeof thing === "string")
        return { name: thing, deep: true };
    {
        if (typeof thing !== "object")
            return fail("expected options object");
        Object.keys(thing).forEach(assertValidOption);
    }
    return thing;
}
function getEnhancerFromOptions(options) {
    return options.defaultDecorator
        ? options.defaultDecorator.enhancer
        : options.deep === false
            ? referenceEnhancer
            : deepEnhancer;
}
var deepDecorator = createDecoratorForEnhancer(deepEnhancer);
var shallowDecorator = createDecoratorForEnhancer(shallowEnhancer);
var refDecorator = createDecoratorForEnhancer(referenceEnhancer);
var refStructDecorator = createDecoratorForEnhancer(refStructEnhancer);
/**
 * Turns an object, array or function into a reactive structure.
 * @param v the value which should become observable.
 */
function createObservable(v, arg2, arg3) {
    // @observable someProp;
    if (typeof arguments[1] === "string") {
        return deepDecorator.apply(null, arguments);
    }
    // it is an observable already, done
    if (isObservable(v))
        return v;
    // something that can be converted and mutated?
    var res = isPlainObject(v)
        ? observable.object(v, arg2, arg3)
        : Array.isArray(v)
            ? observable.array(v, arg2)
            : isES6Map(v)
                ? observable.map(v, arg2)
                : isES6Set(v)
                    ? observable.set(v, arg2)
                    : v;
    // this value could be converted to a new observable data structure, return it
    if (res !== v)
        return res;
    // otherwise, just box it
    fail("The provided value could not be converted into an observable. If you want just create an observable reference to the object use 'observable.box(value)'");
}
var observableFactories = {
    box: function (value, options) {
        if (arguments.length > 2)
            incorrectlyUsedAsDecorator("box");
        var o = asCreateObservableOptions(options);
        return new ObservableValue(value, getEnhancerFromOptions(o), o.name, true, o.equals);
    },
    shallowBox: function (value, name) {
        if (arguments.length > 2)
            incorrectlyUsedAsDecorator("shallowBox");
        deprecated("observable.shallowBox", "observable.box(value, { deep: false })");
        return observable.box(value, { name: name, deep: false });
    },
    array: function (initialValues, options) {
        if (arguments.length > 2)
            incorrectlyUsedAsDecorator("array");
        var o = asCreateObservableOptions(options);
        return new ObservableArray(initialValues, getEnhancerFromOptions(o), o.name);
    },
    shallowArray: function (initialValues, name) {
        if (arguments.length > 2)
            incorrectlyUsedAsDecorator("shallowArray");
        deprecated("observable.shallowArray", "observable.array(values, { deep: false })");
        return observable.array(initialValues, { name: name, deep: false });
    },
    map: function (initialValues, options) {
        if (arguments.length > 2)
            incorrectlyUsedAsDecorator("map");
        var o = asCreateObservableOptions(options);
        return new ObservableMap(initialValues, getEnhancerFromOptions(o), o.name);
    },
    shallowMap: function (initialValues, name) {
        if (arguments.length > 2)
            incorrectlyUsedAsDecorator("shallowMap");
        deprecated("observable.shallowMap", "observable.map(values, { deep: false })");
        return observable.map(initialValues, { name: name, deep: false });
    },
    set: function (initialValues, options) {
        if (arguments.length > 2)
            incorrectlyUsedAsDecorator("set");
        var o = asCreateObservableOptions(options);
        return new ObservableSet(initialValues, getEnhancerFromOptions(o), o.name);
    },
    object: function (props, decorators, options) {
        if (typeof arguments[1] === "string")
            incorrectlyUsedAsDecorator("object");
        var o = asCreateObservableOptions(options);
        return extendObservable({}, props, decorators, o);
    },
    shallowObject: function (props, name) {
        if (typeof arguments[1] === "string")
            incorrectlyUsedAsDecorator("shallowObject");
        deprecated("observable.shallowObject", "observable.object(values, {}, { deep: false })");
        return observable.object(props, {}, { name: name, deep: false });
    },
    ref: refDecorator,
    shallow: shallowDecorator,
    deep: deepDecorator,
    struct: refStructDecorator
};
var observable = createObservable;
// weird trick to keep our typings nicely with our funcs, and still extend the observable function
Object.keys(observableFactories).forEach(function (name) { return (observable[name] = observableFactories[name]); });
function incorrectlyUsedAsDecorator(methodName) {
    fail(
    // "development" !== "production" &&
    "Expected one or two arguments to observable." + methodName + ". Did you accidentally try to use observable." + methodName + " as decorator?");
}

var computedDecorator = createPropDecorator(false, function (instance, propertyName, descriptor, decoratorTarget, decoratorArgs) {
    var get = descriptor.get, set = descriptor.set; // initialValue is the descriptor for get / set props
    // Optimization: faster on decorator target or instance? Assuming target
    // Optimization: find out if declaring on instance isn't just faster. (also makes the property descriptor simpler). But, more memory usage..
    // Forcing instance now, fixes hot reloadig issues on React Native:
    var options = decoratorArgs[0] || {};
    defineComputedProperty(instance, propertyName, __assign({ get: get, set: set }, options));
});
var computedStructDecorator = computedDecorator({ equals: comparer.structural });
/**
 * Decorator for class properties: @computed get value() { return expr; }.
 * For legacy purposes also invokable as ES5 observable created: `computed(() => expr)`;
 */
var computed = function computed(arg1, arg2, arg3) {
    if (typeof arg2 === "string") {
        // @computed
        return computedDecorator.apply(null, arguments);
    }
    if (arg1 !== null && typeof arg1 === "object" && arguments.length === 1) {
        // @computed({ options })
        return computedDecorator.apply(null, arguments);
    }
    // computed(expr, options?)
    {
        invariant(typeof arg1 === "function", "First argument to `computed` should be an expression.");
        invariant(arguments.length < 3, "Computed takes one or two arguments if used as function");
    }
    var opts = typeof arg2 === "object" ? arg2 : {};
    opts.get = arg1;
    opts.set = typeof arg2 === "function" ? arg2 : opts.set;
    opts.name = opts.name || arg1.name || ""; /* for generated name */
    return new ComputedValue(opts);
};
computed.struct = computedStructDecorator;

(function (IDerivationState) {
    // before being run or (outside batch and not being observed)
    // at this point derivation is not holding any data about dependency tree
    IDerivationState[IDerivationState["NOT_TRACKING"] = -1] = "NOT_TRACKING";
    // no shallow dependency changed since last computation
    // won't recalculate derivation
    // this is what makes mobx fast
    IDerivationState[IDerivationState["UP_TO_DATE"] = 0] = "UP_TO_DATE";
    // some deep dependency changed, but don't know if shallow dependency changed
    // will require to check first if UP_TO_DATE or POSSIBLY_STALE
    // currently only ComputedValue will propagate POSSIBLY_STALE
    //
    // having this state is second big optimization:
    // don't have to recompute on every dependency change, but only when it's needed
    IDerivationState[IDerivationState["POSSIBLY_STALE"] = 1] = "POSSIBLY_STALE";
    // A shallow dependency has changed since last computation and the derivation
    // will need to recompute when it's needed next.
    IDerivationState[IDerivationState["STALE"] = 2] = "STALE";
})(exports.IDerivationState || (exports.IDerivationState = {}));
var TraceMode;
(function (TraceMode) {
    TraceMode[TraceMode["NONE"] = 0] = "NONE";
    TraceMode[TraceMode["LOG"] = 1] = "LOG";
    TraceMode[TraceMode["BREAK"] = 2] = "BREAK";
})(TraceMode || (TraceMode = {}));
var CaughtException = /** @class */ (function () {
    function CaughtException(cause) {
        this.cause = cause;
        // Empty
    }
    return CaughtException;
}());
function isCaughtException(e) {
    return e instanceof CaughtException;
}
/**
 * Finds out whether any dependency of the derivation has actually changed.
 * If dependenciesState is 1 then it will recalculate dependencies,
 * if any dependency changed it will propagate it by changing dependenciesState to 2.
 *
 * By iterating over the dependencies in the same order that they were reported and
 * stopping on the first change, all the recalculations are only called for ComputedValues
 * that will be tracked by derivation. That is because we assume that if the first x
 * dependencies of the derivation doesn't change then the derivation should run the same way
 * up until accessing x-th dependency.
 */
function shouldCompute(derivation) {
    switch (derivation.dependenciesState) {
        case exports.IDerivationState.UP_TO_DATE:
            return false;
        case exports.IDerivationState.NOT_TRACKING:
        case exports.IDerivationState.STALE:
            return true;
        case exports.IDerivationState.POSSIBLY_STALE: {
            // state propagation can occur outside of action/reactive context #2195
            var prevAllowStateReads = allowStateReadsStart(true);
            var prevUntracked = untrackedStart(); // no need for those computeds to be reported, they will be picked up in trackDerivedFunction.
            var obs = derivation.observing, l = obs.length;
            for (var i = 0; i < l; i++) {
                var obj = obs[i];
                if (isComputedValue(obj)) {
                    if (globalState.disableErrorBoundaries) {
                        obj.get();
                    }
                    else {
                        try {
                            obj.get();
                        }
                        catch (e) {
                            // we are not interested in the value *or* exception at this moment, but if there is one, notify all
                            untrackedEnd(prevUntracked);
                            allowStateReadsEnd(prevAllowStateReads);
                            return true;
                        }
                    }
                    // if ComputedValue `obj` actually changed it will be computed and propagated to its observers.
                    // and `derivation` is an observer of `obj`
                    // invariantShouldCompute(derivation)
                    if (derivation.dependenciesState === exports.IDerivationState.STALE) {
                        untrackedEnd(prevUntracked);
                        allowStateReadsEnd(prevAllowStateReads);
                        return true;
                    }
                }
            }
            changeDependenciesStateTo0(derivation);
            untrackedEnd(prevUntracked);
            allowStateReadsEnd(prevAllowStateReads);
            return false;
        }
    }
}
// function invariantShouldCompute(derivation: IDerivation) {
//     const newDepState = (derivation as any).dependenciesState
//     if (
//         "development" === "production" &&
//         (newDepState === IDerivationState.POSSIBLY_STALE ||
//             newDepState === IDerivationState.NOT_TRACKING)
//     )
//         fail("Illegal dependency state")
// }
function isComputingDerivation() {
    return globalState.trackingDerivation !== null; // filter out actions inside computations
}
function checkIfStateModificationsAreAllowed(atom) {
    var hasObservers = atom.observers.length > 0;
    // Should never be possible to change an observed observable from inside computed, see #798
    if (globalState.computationDepth > 0 && hasObservers)
        fail("Computed values are not allowed to cause side effects by changing observables that are already being observed. Tried to modify: " + atom.name);
    // Should not be possible to change observed state outside strict mode, except during initialization, see #563
    if (!globalState.allowStateChanges && (hasObservers || globalState.enforceActions === "strict"))
        fail((globalState.enforceActions
                ? "Since strict-mode is enabled, changing observed observable values outside actions is not allowed. Please wrap the code in an `action` if this change is intended. Tried to modify: "
                : "Side effects like changing state are not allowed at this point. Are you trying to modify state from, for example, the render function of a React component? Tried to modify: ") +
                atom.name);
}
function checkIfStateReadsAreAllowed(observable) {
    if (!globalState.allowStateReads &&
        globalState.observableRequiresReaction) {
        console.warn("[mobx] Observable " + observable.name + " being read outside a reactive context");
    }
}
/**
 * Executes the provided function `f` and tracks which observables are being accessed.
 * The tracking information is stored on the `derivation` object and the derivation is registered
 * as observer of any of the accessed observables.
 */
function trackDerivedFunction(derivation, f, context) {
    var prevAllowStateReads = allowStateReadsStart(true);
    // pre allocate array allocation + room for variation in deps
    // array will be trimmed by bindDependencies
    changeDependenciesStateTo0(derivation);
    derivation.newObserving = new Array(derivation.observing.length + 100);
    derivation.unboundDepsCount = 0;
    derivation.runId = ++globalState.runId;
    var prevTracking = globalState.trackingDerivation;
    globalState.trackingDerivation = derivation;
    var result;
    if (globalState.disableErrorBoundaries === true) {
        result = f.call(context);
    }
    else {
        try {
            result = f.call(context);
        }
        catch (e) {
            result = new CaughtException(e);
        }
    }
    globalState.trackingDerivation = prevTracking;
    bindDependencies(derivation);
    if (derivation.observing.length === 0) {
        warnAboutDerivationWithoutDependencies(derivation);
    }
    allowStateReadsEnd(prevAllowStateReads);
    return result;
}
function warnAboutDerivationWithoutDependencies(derivation) {
    if (globalState.reactionRequiresObservable || derivation.requiresObservable) {
        console.warn("[mobx] Derivation " + derivation.name + " is created/updated without reading any observable value");
    }
}
/**
 * diffs newObserving with observing.
 * update observing to be newObserving with unique observables
 * notify observers that become observed/unobserved
 */
function bindDependencies(derivation) {
    // invariant(derivation.dependenciesState !== IDerivationState.NOT_TRACKING, "INTERNAL ERROR bindDependencies expects derivation.dependenciesState !== -1");
    var prevObserving = derivation.observing;
    var observing = (derivation.observing = derivation.newObserving);
    var lowestNewObservingDerivationState = exports.IDerivationState.UP_TO_DATE;
    // Go through all new observables and check diffValue: (this list can contain duplicates):
    //   0: first occurrence, change to 1 and keep it
    //   1: extra occurrence, drop it
    var i0 = 0, l = derivation.unboundDepsCount;
    for (var i = 0; i < l; i++) {
        var dep = observing[i];
        if (dep.diffValue === 0) {
            dep.diffValue = 1;
            if (i0 !== i)
                observing[i0] = dep;
            i0++;
        }
        // Upcast is 'safe' here, because if dep is IObservable, `dependenciesState` will be undefined,
        // not hitting the condition
        if (dep.dependenciesState > lowestNewObservingDerivationState) {
            lowestNewObservingDerivationState = dep.dependenciesState;
        }
    }
    observing.length = i0;
    derivation.newObserving = null; // newObserving shouldn't be needed outside tracking (statement moved down to work around FF bug, see #614)
    // Go through all old observables and check diffValue: (it is unique after last bindDependencies)
    //   0: it's not in new observables, unobserve it
    //   1: it keeps being observed, don't want to notify it. change to 0
    l = prevObserving.length;
    while (l--) {
        var dep = prevObserving[l];
        if (dep.diffValue === 0) {
            removeObserver(dep, derivation);
        }
        dep.diffValue = 0;
    }
    // Go through all new observables and check diffValue: (now it should be unique)
    //   0: it was set to 0 in last loop. don't need to do anything.
    //   1: it wasn't observed, let's observe it. set back to 0
    while (i0--) {
        var dep = observing[i0];
        if (dep.diffValue === 1) {
            dep.diffValue = 0;
            addObserver(dep, derivation);
        }
    }
    // Some new observed derivations may become stale during this derivation computation
    // so they have had no chance to propagate staleness (#916)
    if (lowestNewObservingDerivationState !== exports.IDerivationState.UP_TO_DATE) {
        derivation.dependenciesState = lowestNewObservingDerivationState;
        derivation.onBecomeStale();
    }
}
function clearObserving(derivation) {
    // invariant(globalState.inBatch > 0, "INTERNAL ERROR clearObserving should be called only inside batch");
    var obs = derivation.observing;
    derivation.observing = [];
    var i = obs.length;
    while (i--)
        removeObserver(obs[i], derivation);
    derivation.dependenciesState = exports.IDerivationState.NOT_TRACKING;
}
function untracked(action) {
    var prev = untrackedStart();
    var res = action();
    untrackedEnd(prev);
    return res;
}
function untrackedStart() {
    var prev = globalState.trackingDerivation;
    globalState.trackingDerivation = null;
    return prev;
}
function untrackedEnd(prev) {
    globalState.trackingDerivation = prev;
}
function allowStateReadsStart(allowStateReads) {
    var prev = globalState.allowStateReads;
    globalState.allowStateReads = allowStateReads;
    return prev;
}
function allowStateReadsEnd(prev) {
    globalState.allowStateReads = prev;
}
/**
 * needed to keep `lowestObserverState` correct. when changing from (2 or 1) to 0
 *
 */
function changeDependenciesStateTo0(derivation) {
    if (derivation.dependenciesState === exports.IDerivationState.UP_TO_DATE)
        return;
    derivation.dependenciesState = exports.IDerivationState.UP_TO_DATE;
    var obs = derivation.observing;
    var i = obs.length;
    while (i--)
        obs[i].lowestObserverState = exports.IDerivationState.UP_TO_DATE;
}

// we don't use globalState for these in order to avoid possible issues with multiple
// mobx versions
var currentActionId = 0;
var nextActionId = 1;
var functionNameDescriptor = Object.getOwnPropertyDescriptor(function () { }, "name");
var isFunctionNameConfigurable = functionNameDescriptor && functionNameDescriptor.configurable;
function createAction(actionName, fn) {
    {
        invariant(typeof fn === "function", "`action` can only be invoked on functions");
        if (typeof actionName !== "string" || !actionName)
            fail("actions should have valid names, got: '" + actionName + "'");
    }
    var res = function () {
        return executeAction(actionName, fn, this, arguments);
    };
    {
        if (isFunctionNameConfigurable) {
            Object.defineProperty(res, "name", { value: actionName });
        }
    }
    res.isMobxAction = true;
    return res;
}
function executeAction(actionName, fn, scope, args) {
    var runInfo = _startAction(actionName, scope, args);
    try {
        return fn.apply(scope, args);
    }
    catch (err) {
        runInfo.error = err;
        throw err;
    }
    finally {
        _endAction(runInfo);
    }
}
function _startAction(actionName, scope, args) {
    var notifySpy = isSpyEnabled() && !!actionName;
    var startTime = 0;
    if (notifySpy) {
        startTime = Date.now();
        var l = (args && args.length) || 0;
        var flattendArgs = new Array(l);
        if (l > 0)
            for (var i = 0; i < l; i++)
                flattendArgs[i] = args[i];
        spyReportStart({
            type: "action",
            name: actionName,
            object: scope,
            arguments: flattendArgs
        });
    }
    var prevDerivation = untrackedStart();
    startBatch();
    var prevAllowStateChanges = allowStateChangesStart(true);
    var prevAllowStateReads = allowStateReadsStart(true);
    var runInfo = {
        prevDerivation: prevDerivation,
        prevAllowStateChanges: prevAllowStateChanges,
        prevAllowStateReads: prevAllowStateReads,
        notifySpy: notifySpy,
        startTime: startTime,
        actionId: nextActionId++,
        parentActionId: currentActionId
    };
    currentActionId = runInfo.actionId;
    return runInfo;
}
function _endAction(runInfo) {
    if (currentActionId !== runInfo.actionId) {
        fail("invalid action stack. did you forget to finish an action?");
    }
    currentActionId = runInfo.parentActionId;
    if (runInfo.error !== undefined) {
        globalState.suppressReactionErrors = true;
    }
    allowStateChangesEnd(runInfo.prevAllowStateChanges);
    allowStateReadsEnd(runInfo.prevAllowStateReads);
    endBatch();
    untrackedEnd(runInfo.prevDerivation);
    if (runInfo.notifySpy) {
        spyReportEnd({ time: Date.now() - runInfo.startTime });
    }
    globalState.suppressReactionErrors = false;
}
function allowStateChanges(allowStateChanges, func) {
    var prev = allowStateChangesStart(allowStateChanges);
    var res;
    try {
        res = func();
    }
    finally {
        allowStateChangesEnd(prev);
    }
    return res;
}
function allowStateChangesStart(allowStateChanges) {
    var prev = globalState.allowStateChanges;
    globalState.allowStateChanges = allowStateChanges;
    return prev;
}
function allowStateChangesEnd(prev) {
    globalState.allowStateChanges = prev;
}
function allowStateChangesInsideComputed(func) {
    var prev = globalState.computationDepth;
    globalState.computationDepth = 0;
    var res;
    try {
        res = func();
    }
    finally {
        globalState.computationDepth = prev;
    }
    return res;
}

var ObservableValue = /** @class */ (function (_super) {
    __extends(ObservableValue, _super);
    function ObservableValue(value, enhancer, name, notifySpy, equals) {
        if (name === void 0) { name = "ObservableValue@" + getNextId(); }
        if (notifySpy === void 0) { notifySpy = true; }
        if (equals === void 0) { equals = comparer.default; }
        var _this = _super.call(this, name) || this;
        _this.enhancer = enhancer;
        _this.name = name;
        _this.equals = equals;
        _this.hasUnreportedChange = false;
        _this.value = enhancer(value, undefined, name);
        if (notifySpy && isSpyEnabled()) {
            // only notify spy if this is a stand-alone observable
            spyReport({ type: "create", name: _this.name, newValue: "" + _this.value });
        }
        return _this;
    }
    ObservableValue.prototype.dehanceValue = function (value) {
        if (this.dehancer !== undefined)
            return this.dehancer(value);
        return value;
    };
    ObservableValue.prototype.set = function (newValue) {
        var oldValue = this.value;
        newValue = this.prepareNewValue(newValue);
        if (newValue !== globalState.UNCHANGED) {
            var notifySpy = isSpyEnabled();
            if (notifySpy) {
                spyReportStart({
                    type: "update",
                    name: this.name,
                    newValue: newValue,
                    oldValue: oldValue
                });
            }
            this.setNewValue(newValue);
            if (notifySpy)
                spyReportEnd();
        }
    };
    ObservableValue.prototype.prepareNewValue = function (newValue) {
        checkIfStateModificationsAreAllowed(this);
        if (hasInterceptors(this)) {
            var change = interceptChange(this, {
                object: this,
                type: "update",
                newValue: newValue
            });
            if (!change)
                return globalState.UNCHANGED;
            newValue = change.newValue;
        }
        // apply modifier
        newValue = this.enhancer(newValue, this.value, this.name);
        return this.equals(this.value, newValue) ? globalState.UNCHANGED : newValue;
    };
    ObservableValue.prototype.setNewValue = function (newValue) {
        var oldValue = this.value;
        this.value = newValue;
        this.reportChanged();
        if (hasListeners(this)) {
            notifyListeners(this, {
                type: "update",
                object: this,
                newValue: newValue,
                oldValue: oldValue
            });
        }
    };
    ObservableValue.prototype.get = function () {
        this.reportObserved();
        return this.dehanceValue(this.value);
    };
    ObservableValue.prototype.intercept = function (handler) {
        return registerInterceptor(this, handler);
    };
    ObservableValue.prototype.observe = function (listener, fireImmediately) {
        if (fireImmediately)
            listener({
                object: this,
                type: "update",
                newValue: this.value,
                oldValue: undefined
            });
        return registerListener(this, listener);
    };
    ObservableValue.prototype.toJSON = function () {
        return this.get();
    };
    ObservableValue.prototype.toString = function () {
        return this.name + "[" + this.value + "]";
    };
    ObservableValue.prototype.valueOf = function () {
        return toPrimitive(this.get());
    };
    return ObservableValue;
}(Atom));
ObservableValue.prototype[primitiveSymbol()] = ObservableValue.prototype.valueOf;
var isObservableValue = createInstanceofPredicate("ObservableValue", ObservableValue);

/**
 * A node in the state dependency root that observes other nodes, and can be observed itself.
 *
 * ComputedValue will remember the result of the computation for the duration of the batch, or
 * while being observed.
 *
 * During this time it will recompute only when one of its direct dependencies changed,
 * but only when it is being accessed with `ComputedValue.get()`.
 *
 * Implementation description:
 * 1. First time it's being accessed it will compute and remember result
 *    give back remembered result until 2. happens
 * 2. First time any deep dependency change, propagate POSSIBLY_STALE to all observers, wait for 3.
 * 3. When it's being accessed, recompute if any shallow dependency changed.
 *    if result changed: propagate STALE to all observers, that were POSSIBLY_STALE from the last step.
 *    go to step 2. either way
 *
 * If at any point it's outside batch and it isn't observed: reset everything and go to 1.
 */
var ComputedValue = /** @class */ (function () {
    /**
     * Create a new computed value based on a function expression.
     *
     * The `name` property is for debug purposes only.
     *
     * The `equals` property specifies the comparer function to use to determine if a newly produced
     * value differs from the previous value. Two comparers are provided in the library; `defaultComparer`
     * compares based on identity comparison (===), and `structualComparer` deeply compares the structure.
     * Structural comparison can be convenient if you always produce a new aggregated object and
     * don't want to notify observers if it is structurally the same.
     * This is useful for working with vectors, mouse coordinates etc.
     */
    function ComputedValue(options) {
        this.dependenciesState = exports.IDerivationState.NOT_TRACKING;
        this.observing = []; // nodes we are looking at. Our value depends on these nodes
        this.newObserving = null; // during tracking it's an array with new observed observers
        this.isBeingObserved = false;
        this.isPendingUnobservation = false;
        this.observers = [];
        this.observersIndexes = {};
        this.diffValue = 0;
        this.runId = 0;
        this.lastAccessedBy = 0;
        this.lowestObserverState = exports.IDerivationState.UP_TO_DATE;
        this.unboundDepsCount = 0;
        this.__mapid = "#" + getNextId();
        this.value = new CaughtException(null);
        this.isComputing = false; // to check for cycles
        this.isRunningSetter = false;
        this.isTracing = TraceMode.NONE;
        invariant(options.get, "missing option for computed: get");
        this.derivation = options.get;
        this.name = options.name || "ComputedValue@" + getNextId();
        if (options.set)
            this.setter = createAction(this.name + "-setter", options.set);
        this.equals =
            options.equals ||
                (options.compareStructural || options.struct
                    ? comparer.structural
                    : comparer.default);
        this.scope = options.context;
        this.requiresReaction = !!options.requiresReaction;
        this.keepAlive = !!options.keepAlive;
    }
    ComputedValue.prototype.onBecomeStale = function () {
        propagateMaybeChanged(this);
    };
    ComputedValue.prototype.onBecomeUnobserved = function () { };
    ComputedValue.prototype.onBecomeObserved = function () { };
    /**
     * Returns the current value of this computed value.
     * Will evaluate its computation first if needed.
     */
    ComputedValue.prototype.get = function () {
        if (this.isComputing)
            fail("Cycle detected in computation " + this.name + ": " + this.derivation);
        if (globalState.inBatch === 0 && this.observers.length === 0 && !this.keepAlive) {
            if (shouldCompute(this)) {
                this.warnAboutUntrackedRead();
                startBatch(); // See perf test 'computed memoization'
                this.value = this.computeValue(false);
                endBatch();
            }
        }
        else {
            reportObserved(this);
            if (shouldCompute(this))
                if (this.trackAndCompute())
                    propagateChangeConfirmed(this);
        }
        var result = this.value;
        if (isCaughtException(result))
            throw result.cause;
        return result;
    };
    ComputedValue.prototype.peek = function () {
        var res = this.computeValue(false);
        if (isCaughtException(res))
            throw res.cause;
        return res;
    };
    ComputedValue.prototype.set = function (value) {
        if (this.setter) {
            invariant(!this.isRunningSetter, "The setter of computed value '" + this.name + "' is trying to update itself. Did you intend to update an _observable_ value, instead of the computed property?");
            this.isRunningSetter = true;
            try {
                this.setter.call(this.scope, value);
            }
            finally {
                this.isRunningSetter = false;
            }
        }
        else
            invariant(false, "[ComputedValue '" + this.name + "'] It is not possible to assign a new value to a computed value.");
    };
    ComputedValue.prototype.trackAndCompute = function () {
        if (isSpyEnabled()) {
            spyReport({
                object: this.scope,
                type: "compute",
                name: this.name
            });
        }
        var oldValue = this.value;
        var wasSuspended = 
        /* see #1208 */ this.dependenciesState === exports.IDerivationState.NOT_TRACKING;
        var newValue = this.computeValue(true);
        var changed = wasSuspended ||
            isCaughtException(oldValue) ||
            isCaughtException(newValue) ||
            !this.equals(oldValue, newValue);
        if (changed) {
            this.value = newValue;
        }
        return changed;
    };
    ComputedValue.prototype.computeValue = function (track) {
        this.isComputing = true;
        globalState.computationDepth++;
        var res;
        if (track) {
            res = trackDerivedFunction(this, this.derivation, this.scope);
        }
        else {
            if (globalState.disableErrorBoundaries === true) {
                res = this.derivation.call(this.scope);
            }
            else {
                try {
                    res = this.derivation.call(this.scope);
                }
                catch (e) {
                    res = new CaughtException(e);
                }
            }
        }
        globalState.computationDepth--;
        this.isComputing = false;
        return res;
    };
    ComputedValue.prototype.suspend = function () {
        if (!this.keepAlive) {
            clearObserving(this);
            this.value = undefined; // don't hold on to computed value!
        }
    };
    ComputedValue.prototype.observe = function (listener, fireImmediately) {
        var _this = this;
        var firstTime = true;
        var prevValue = undefined;
        return autorun(function () {
            var newValue = _this.get();
            if (!firstTime || fireImmediately) {
                var prevU = untrackedStart();
                listener({
                    type: "update",
                    object: _this,
                    newValue: newValue,
                    oldValue: prevValue
                });
                untrackedEnd(prevU);
            }
            firstTime = false;
            prevValue = newValue;
        });
    };
    ComputedValue.prototype.warnAboutUntrackedRead = function () {
        if (this.requiresReaction === true) {
            fail("[mobx] Computed value " + this.name + " is read outside a reactive context");
        }
        if (this.isTracing !== TraceMode.NONE) {
            console.log("[mobx.trace] '" + this.name + "' is being read outside a reactive context. Doing a full recompute");
        }
        if (globalState.computedRequiresReaction) {
            console.warn("[mobx] Computed value " + this.name + " is being read outside a reactive context. Doing a full recompute");
        }
    };
    ComputedValue.prototype.toJSON = function () {
        return this.get();
    };
    ComputedValue.prototype.toString = function () {
        return this.name + "[" + this.derivation.toString() + "]";
    };
    ComputedValue.prototype.valueOf = function () {
        return toPrimitive(this.get());
    };
    return ComputedValue;
}());
ComputedValue.prototype[primitiveSymbol()] = ComputedValue.prototype.valueOf;
var isComputedValue = createInstanceofPredicate("ComputedValue", ComputedValue);

/**
 * These values will persist if global state is reset
 */
var persistentKeys = [
    "mobxGuid",
    "spyListeners",
    "enforceActions",
    "computedRequiresReaction",
    "reactionRequiresObservable",
    "observableRequiresReaction",
    "allowStateReads",
    "disableErrorBoundaries",
    "runId",
    "UNCHANGED"
];
var MobXGlobals = /** @class */ (function () {
    function MobXGlobals() {
        /**
         * MobXGlobals version.
         * MobX compatiblity with other versions loaded in memory as long as this version matches.
         * It indicates that the global state still stores similar information
         *
         * N.B: this version is unrelated to the package version of MobX, and is only the version of the
         * internal state storage of MobX, and can be the same across many different package versions
         */
        this.version = 5;
        /**
         * globally unique token to signal unchanged
         */
        this.UNCHANGED = {};
        /**
         * Currently running derivation
         */
        this.trackingDerivation = null;
        /**
         * Are we running a computation currently? (not a reaction)
         */
        this.computationDepth = 0;
        /**
         * Each time a derivation is tracked, it is assigned a unique run-id
         */
        this.runId = 0;
        /**
         * 'guid' for general purpose. Will be persisted amongst resets.
         */
        this.mobxGuid = 0;
        /**
         * Are we in a batch block? (and how many of them)
         */
        this.inBatch = 0;
        /**
         * Observables that don't have observers anymore, and are about to be
         * suspended, unless somebody else accesses it in the same batch
         *
         * @type {IObservable[]}
         */
        this.pendingUnobservations = [];
        /**
         * List of scheduled, not yet executed, reactions.
         */
        this.pendingReactions = [];
        /**
         * Are we currently processing reactions?
         */
        this.isRunningReactions = false;
        /**
         * Is it allowed to change observables at this point?
         * In general, MobX doesn't allow that when running computations and React.render.
         * To ensure that those functions stay pure.
         */
        this.allowStateChanges = true;
        /**
         * Is it allowed to read observables at this point?
         * Used to hold the state needed for `observableRequiresReaction`
         */
        this.allowStateReads = true;
        /**
         * If strict mode is enabled, state changes are by default not allowed
         */
        this.enforceActions = false;
        /**
         * Spy callbacks
         */
        this.spyListeners = [];
        /**
         * Globally attached error handlers that react specifically to errors in reactions
         */
        this.globalReactionErrorHandlers = [];
        /**
         * Warn if computed values are accessed outside a reactive context
         */
        this.computedRequiresReaction = false;
        /**
         * (Experimental)
         * Warn if you try to create to derivation / reactive context without accessing any observable.
         */
        this.reactionRequiresObservable = false;
        /**
         * (Experimental)
         * Warn if observables are accessed outside a reactive context
         */
        this.observableRequiresReaction = false;
        /**
         * Allows overwriting of computed properties, useful in tests but not prod as it can cause
         * memory leaks. See https://github.com/mobxjs/mobx/issues/1867
         */
        this.computedConfigurable = false;
        /*
         * Don't catch and rethrow exceptions. This is useful for inspecting the state of
         * the stack when an exception occurs while debugging.
         */
        this.disableErrorBoundaries = false;
        /*
         * If true, we are already handling an exception in an action. Any errors in reactions should be supressed, as
         * they are not the cause, see: https://github.com/mobxjs/mobx/issues/1836
         */
        this.suppressReactionErrors = false;
    }
    return MobXGlobals;
}());
var canMergeGlobalState = true;
var isolateCalled = false;
var globalState = (function () {
    var global = getGlobal();
    if (global.__mobxInstanceCount > 0 && !global.__mobxGlobals)
        canMergeGlobalState = false;
    if (global.__mobxGlobals && global.__mobxGlobals.version !== new MobXGlobals().version)
        canMergeGlobalState = false;
    if (!canMergeGlobalState) {
        setTimeout(function () {
            if (!isolateCalled) {
                fail("There are multiple, different versions of MobX active. Make sure MobX is loaded only once or use `configure({ isolateGlobalState: true })`");
            }
        }, 1);
        return new MobXGlobals();
    }
    else if (global.__mobxGlobals) {
        global.__mobxInstanceCount += 1;
        if (!global.__mobxGlobals.UNCHANGED)
            global.__mobxGlobals.UNCHANGED = {}; // make merge backward compatible
        return global.__mobxGlobals;
    }
    else {
        global.__mobxInstanceCount = 1;
        return (global.__mobxGlobals = new MobXGlobals());
    }
})();
function isolateGlobalState() {
    if (globalState.pendingReactions.length ||
        globalState.inBatch ||
        globalState.isRunningReactions)
        fail("isolateGlobalState should be called before MobX is running any reactions");
    isolateCalled = true;
    if (canMergeGlobalState) {
        if (--getGlobal().__mobxInstanceCount === 0)
            getGlobal().__mobxGlobals = undefined;
        globalState = new MobXGlobals();
    }
}
function getGlobalState() {
    return globalState;
}
/**
 * For testing purposes only; this will break the internal state of existing observables,
 * but can be used to get back at a stable state after throwing errors
 */
function resetGlobalState() {
    var defaultGlobals = new MobXGlobals();
    for (var key in defaultGlobals)
        if (persistentKeys.indexOf(key) === -1)
            globalState[key] = defaultGlobals[key];
    globalState.allowStateChanges = !globalState.enforceActions;
}

function hasObservers(observable) {
    return observable.observers && observable.observers.length > 0;
}
function getObservers(observable) {
    return observable.observers;
}
// function invariantObservers(observable: IObservable) {
//     const list = observable.observers
//     const map = observable.observersIndexes
//     const l = list.length
//     for (let i = 0; i < l; i++) {
//         const id = list[i].__mapid
//         if (i) {
//             invariant(map[id] === i, "INTERNAL ERROR maps derivation.__mapid to index in list") // for performance
//         } else {
//             invariant(!(id in map), "INTERNAL ERROR observer on index 0 shouldn't be held in map.") // for performance
//         }
//     }
//     invariant(
//         list.length === 0 || Object.keys(map).length === list.length - 1,
//         "INTERNAL ERROR there is no junk in map"
//     )
// }
function addObserver(observable, node) {
    // invariant(node.dependenciesState !== -1, "INTERNAL ERROR, can add only dependenciesState !== -1");
    // invariant(observable._observers.indexOf(node) === -1, "INTERNAL ERROR add already added node");
    // invariantObservers(observable);
    var l = observable.observers.length;
    if (l) {
        // because object assignment is relatively expensive, let's not store data about index 0.
        observable.observersIndexes[node.__mapid] = l;
    }
    observable.observers[l] = node;
    if (observable.lowestObserverState > node.dependenciesState)
        observable.lowestObserverState = node.dependenciesState;
    // invariantObservers(observable);
    // invariant(observable._observers.indexOf(node) !== -1, "INTERNAL ERROR didn't add node");
}
function removeObserver(observable, node) {
    // invariant(globalState.inBatch > 0, "INTERNAL ERROR, remove should be called only inside batch");
    // invariant(observable._observers.indexOf(node) !== -1, "INTERNAL ERROR remove already removed node");
    // invariantObservers(observable);
    if (observable.observers.length === 1) {
        // deleting last observer
        observable.observers.length = 0;
        queueForUnobservation(observable);
    }
    else {
        // deleting from _observersIndexes is straight forward, to delete from _observers, let's swap `node` with last element
        var list = observable.observers;
        var map = observable.observersIndexes;
        var filler = list.pop(); // get last element, which should fill the place of `node`, so the array doesn't have holes
        if (filler !== node) {
            // otherwise node was the last element, which already got removed from array
            var index = map[node.__mapid] || 0; // getting index of `node`. this is the only place we actually use map.
            if (index) {
                // map store all indexes but 0, see comment in `addObserver`
                map[filler.__mapid] = index;
            }
            else {
                delete map[filler.__mapid];
            }
            list[index] = filler;
        }
        delete map[node.__mapid];
    }
    // invariantObservers(observable);
    // invariant(observable._observers.indexOf(node) === -1, "INTERNAL ERROR remove already removed node2");
}
function queueForUnobservation(observable) {
    if (observable.isPendingUnobservation === false) {
        // invariant(observable._observers.length === 0, "INTERNAL ERROR, should only queue for unobservation unobserved observables");
        observable.isPendingUnobservation = true;
        globalState.pendingUnobservations.push(observable);
    }
}
/**
 * Batch starts a transaction, at least for purposes of memoizing ComputedValues when nothing else does.
 * During a batch `onBecomeUnobserved` will be called at most once per observable.
 * Avoids unnecessary recalculations.
 */
function startBatch() {
    globalState.inBatch++;
}
function endBatch() {
    if (--globalState.inBatch === 0) {
        runReactions();
        // the batch is actually about to finish, all unobserving should happen here.
        var list = globalState.pendingUnobservations;
        for (var i = 0; i < list.length; i++) {
            var observable = list[i];
            observable.isPendingUnobservation = false;
            if (observable.observers.length === 0) {
                if (observable.isBeingObserved) {
                    // if this observable had reactive observers, trigger the hooks
                    observable.isBeingObserved = false;
                    observable.onBecomeUnobserved();
                }
                if (observable instanceof ComputedValue) {
                    // computed values are automatically teared down when the last observer leaves
                    // this process happens recursively, this computed might be the last observabe of another, etc..
                    observable.suspend();
                }
            }
        }
        globalState.pendingUnobservations = [];
    }
}
function reportObserved(observable) {
    checkIfStateReadsAreAllowed(observable);
    var derivation = globalState.trackingDerivation;
    if (derivation !== null) {
        /**
         * Simple optimization, give each derivation run an unique id (runId)
         * Check if last time this observable was accessed the same runId is used
         * if this is the case, the relation is already known
         */
        if (derivation.runId !== observable.lastAccessedBy) {
            observable.lastAccessedBy = derivation.runId;
            derivation.newObserving[derivation.unboundDepsCount++] = observable;
            if (!observable.isBeingObserved) {
                observable.isBeingObserved = true;
                observable.onBecomeObserved();
            }
        }
        return true;
    }
    else if (observable.observers.length === 0 && globalState.inBatch > 0) {
        queueForUnobservation(observable);
    }
    return false;
}
// function invariantLOS(observable: IObservable, msg: string) {
//     // it's expensive so better not run it in produciton. but temporarily helpful for testing
//     const min = getObservers(observable).reduce((a, b) => Math.min(a, b.dependenciesState), 2)
//     if (min >= observable.lowestObserverState) return // <- the only assumption about `lowestObserverState`
//     throw new Error(
//         "lowestObserverState is wrong for " +
//             msg +
//             " because " +
//             min +
//             " < " +
//             observable.lowestObserverState
//     )
// }
/**
 * NOTE: current propagation mechanism will in case of self reruning autoruns behave unexpectedly
 * It will propagate changes to observers from previous run
 * It's hard or maybe impossible (with reasonable perf) to get it right with current approach
 * Hopefully self reruning autoruns aren't a feature people should depend on
 * Also most basic use cases should be ok
 */
// Called by Atom when its value changes
function propagateChanged(observable) {
    // invariantLOS(observable, "changed start");
    if (observable.lowestObserverState === exports.IDerivationState.STALE)
        return;
    observable.lowestObserverState = exports.IDerivationState.STALE;
    var observers = observable.observers;
    var i = observers.length;
    while (i--) {
        var d = observers[i];
        if (d.dependenciesState === exports.IDerivationState.UP_TO_DATE) {
            if (d.isTracing !== TraceMode.NONE) {
                logTraceInfo(d, observable);
            }
            d.onBecomeStale();
        }
        d.dependenciesState = exports.IDerivationState.STALE;
    }
    // invariantLOS(observable, "changed end");
}
// Called by ComputedValue when it recalculate and its value changed
function propagateChangeConfirmed(observable) {
    // invariantLOS(observable, "confirmed start");
    if (observable.lowestObserverState === exports.IDerivationState.STALE)
        return;
    observable.lowestObserverState = exports.IDerivationState.STALE;
    var observers = observable.observers;
    var i = observers.length;
    while (i--) {
        var d = observers[i];
        if (d.dependenciesState === exports.IDerivationState.POSSIBLY_STALE)
            d.dependenciesState = exports.IDerivationState.STALE;
        else if (d.dependenciesState === exports.IDerivationState.UP_TO_DATE // this happens during computing of `d`, just keep lowestObserverState up to date.
        )
            observable.lowestObserverState = exports.IDerivationState.UP_TO_DATE;
    }
    // invariantLOS(observable, "confirmed end");
}
// Used by computed when its dependency changed, but we don't wan't to immediately recompute.
function propagateMaybeChanged(observable) {
    // invariantLOS(observable, "maybe start");
    if (observable.lowestObserverState !== exports.IDerivationState.UP_TO_DATE)
        return;
    observable.lowestObserverState = exports.IDerivationState.POSSIBLY_STALE;
    var observers = observable.observers;
    var i = observers.length;
    while (i--) {
        var d = observers[i];
        if (d.dependenciesState === exports.IDerivationState.UP_TO_DATE) {
            d.dependenciesState = exports.IDerivationState.POSSIBLY_STALE;
            if (d.isTracing !== TraceMode.NONE) {
                logTraceInfo(d, observable);
            }
            d.onBecomeStale();
        }
    }
    // invariantLOS(observable, "maybe end");
}
function logTraceInfo(derivation, observable) {
    console.log("[mobx.trace] '" + derivation.name + "' is invalidated due to a change in: '" + observable.name + "'");
    if (derivation.isTracing === TraceMode.BREAK) {
        var lines = [];
        printDepTree(getDependencyTree(derivation), lines, 1);
        // prettier-ignore
        new Function("debugger;\n/*\nTracing '" + derivation.name + "'\n\nYou are entering this break point because derivation '" + derivation.name + "' is being traced and '" + observable.name + "' is now forcing it to update.\nJust follow the stacktrace you should now see in the devtools to see precisely what piece of your code is causing this update\nThe stackframe you are looking for is at least ~6-8 stack-frames up.\n\n" + (derivation instanceof ComputedValue ? derivation.derivation.toString().replace(/[*]\//g, "/") : "") + "\n\nThe dependencies for this derivation are:\n\n" + lines.join("\n") + "\n*/\n    ")();
    }
}
function printDepTree(tree, lines, depth) {
    if (lines.length >= 1000) {
        lines.push("(and many more)");
        return;
    }
    lines.push("" + new Array(depth).join("\t") + tree.name); // MWE: not the fastest, but the easiest way :)
    if (tree.dependencies)
        tree.dependencies.forEach(function (child) { return printDepTree(child, lines, depth + 1); });
}

var Reaction = /** @class */ (function () {
    function Reaction(name, onInvalidate, errorHandler, requiresObservable) {
        if (name === void 0) { name = "Reaction@" + getNextId(); }
        if (requiresObservable === void 0) { requiresObservable = false; }
        this.name = name;
        this.onInvalidate = onInvalidate;
        this.errorHandler = errorHandler;
        this.requiresObservable = requiresObservable;
        this.observing = []; // nodes we are looking at. Our value depends on these nodes
        this.newObserving = [];
        this.dependenciesState = exports.IDerivationState.NOT_TRACKING;
        this.diffValue = 0;
        this.runId = 0;
        this.unboundDepsCount = 0;
        this.__mapid = "#" + getNextId();
        this.isDisposed = false;
        this._isScheduled = false;
        this._isTrackPending = false;
        this._isRunning = false;
        this.isTracing = TraceMode.NONE;
    }
    Reaction.prototype.onBecomeStale = function () {
        this.schedule();
    };
    Reaction.prototype.schedule = function () {
        if (!this._isScheduled) {
            this._isScheduled = true;
            globalState.pendingReactions.push(this);
            runReactions();
        }
    };
    Reaction.prototype.isScheduled = function () {
        return this._isScheduled;
    };
    /**
     * internal, use schedule() if you intend to kick off a reaction
     */
    Reaction.prototype.runReaction = function () {
        if (!this.isDisposed) {
            startBatch();
            this._isScheduled = false;
            if (shouldCompute(this)) {
                this._isTrackPending = true;
                try {
                    this.onInvalidate();
                    if (this._isTrackPending && isSpyEnabled()) {
                        // onInvalidate didn't trigger track right away..
                        spyReport({
                            name: this.name,
                            type: "scheduled-reaction"
                        });
                    }
                }
                catch (e) {
                    this.reportExceptionInDerivation(e);
                }
            }
            endBatch();
        }
    };
    Reaction.prototype.track = function (fn) {
        startBatch();
        var notify = isSpyEnabled();
        var startTime;
        if (notify) {
            startTime = Date.now();
            spyReportStart({
                name: this.name,
                type: "reaction"
            });
        }
        this._isRunning = true;
        var result = trackDerivedFunction(this, fn, undefined);
        this._isRunning = false;
        this._isTrackPending = false;
        if (this.isDisposed) {
            // disposed during last run. Clean up everything that was bound after the dispose call.
            clearObserving(this);
        }
        if (isCaughtException(result))
            this.reportExceptionInDerivation(result.cause);
        if (notify) {
            spyReportEnd({
                time: Date.now() - startTime
            });
        }
        endBatch();
    };
    Reaction.prototype.reportExceptionInDerivation = function (error) {
        var _this = this;
        if (this.errorHandler) {
            this.errorHandler(error, this);
            return;
        }
        if (globalState.disableErrorBoundaries)
            throw error;
        var message = "[mobx] Encountered an uncaught exception that was thrown by a reaction or observer component, in: '" + this + "'";
        if (globalState.suppressReactionErrors) {
            console.warn("[mobx] (error in reaction '" + this.name + "' suppressed, fix error of causing action below)"); // prettier-ignore
        }
        else {
            console.error(message, error);
            /** If debugging brought you here, please, read the above message :-). Tnx! */
        }
        if (isSpyEnabled()) {
            spyReport({
                type: "error",
                name: this.name,
                message: message,
                error: "" + error
            });
        }
        globalState.globalReactionErrorHandlers.forEach(function (f) { return f(error, _this); });
    };
    Reaction.prototype.dispose = function () {
        if (!this.isDisposed) {
            this.isDisposed = true;
            if (!this._isRunning) {
                // if disposed while running, clean up later. Maybe not optimal, but rare case
                startBatch();
                clearObserving(this);
                endBatch();
            }
        }
    };
    Reaction.prototype.getDisposer = function () {
        var r = this.dispose.bind(this);
        r.$mobx = this;
        return r;
    };
    Reaction.prototype.toString = function () {
        return "Reaction[" + this.name + "]";
    };
    Reaction.prototype.trace = function (enterBreakPoint) {
        if (enterBreakPoint === void 0) { enterBreakPoint = false; }
        trace(this, enterBreakPoint);
    };
    return Reaction;
}());
function onReactionError(handler) {
    globalState.globalReactionErrorHandlers.push(handler);
    return function () {
        var idx = globalState.globalReactionErrorHandlers.indexOf(handler);
        if (idx >= 0)
            globalState.globalReactionErrorHandlers.splice(idx, 1);
    };
}
/**
 * Magic number alert!
 * Defines within how many times a reaction is allowed to re-trigger itself
 * until it is assumed that this is gonna be a never ending loop...
 */
var MAX_REACTION_ITERATIONS = 100;
var reactionScheduler = function (f) { return f(); };
function runReactions() {
    // Trampolining, if runReactions are already running, new reactions will be picked up
    if (globalState.inBatch > 0 || globalState.isRunningReactions)
        return;
    reactionScheduler(runReactionsHelper);
}
function runReactionsHelper() {
    globalState.isRunningReactions = true;
    var allReactions = globalState.pendingReactions;
    var iterations = 0;
    // While running reactions, new reactions might be triggered.
    // Hence we work with two variables and check whether
    // we converge to no remaining reactions after a while.
    while (allReactions.length > 0) {
        if (++iterations === MAX_REACTION_ITERATIONS) {
            console.error("Reaction doesn't converge to a stable state after " + MAX_REACTION_ITERATIONS + " iterations." +
                (" Probably there is a cycle in the reactive function: " + allReactions[0]));
            allReactions.splice(0); // clear reactions
        }
        var remainingReactions = allReactions.splice(0);
        for (var i = 0, l = remainingReactions.length; i < l; i++)
            remainingReactions[i].runReaction();
    }
    globalState.isRunningReactions = false;
}
var isReaction = createInstanceofPredicate("Reaction", Reaction);
function setReactionScheduler(fn) {
    var baseScheduler = reactionScheduler;
    reactionScheduler = function (f) { return fn(function () { return baseScheduler(f); }); };
}

function isSpyEnabled() {
    return !!globalState.spyListeners.length;
}
function spyReport(event) {
    if (!globalState.spyListeners.length)
        return;
    var listeners = globalState.spyListeners;
    for (var i = 0, l = listeners.length; i < l; i++)
        listeners[i](event);
}
function spyReportStart(event) {
    var change = __assign(__assign({}, event), { spyReportStart: true });
    spyReport(change);
}
var END_EVENT = { spyReportEnd: true };
function spyReportEnd(change) {
    if (change)
        spyReport(__assign(__assign({}, change), { spyReportEnd: true }));
    else
        spyReport(END_EVENT);
}
function spy(listener) {
    globalState.spyListeners.push(listener);
    return once(function () {
        globalState.spyListeners = globalState.spyListeners.filter(function (l) { return l !== listener; });
    });
}

function dontReassignFields() {
    fail("@action fields are not reassignable");
}
function namedActionDecorator(name) {
    return function (target, prop, descriptor) {
        if (descriptor) {
            if (descriptor.get !== undefined) {
                return fail("@action cannot be used with getters");
            }
            // babel / typescript
            // @action method() { }
            if (descriptor.value) {
                // typescript
                return {
                    value: createAction(name, descriptor.value),
                    enumerable: false,
                    configurable: true,
                    writable: true // for typescript, this must be writable, otherwise it cannot inherit :/ (see inheritable actions test)
                };
            }
            // babel only: @action method = () => {}
            var initializer_1 = descriptor.initializer;
            return {
                enumerable: false,
                configurable: true,
                writable: true,
                initializer: function () {
                    // N.B: we can't immediately invoke initializer; this would be wrong
                    return createAction(name, initializer_1.call(this));
                }
            };
        }
        // bound instance methods
        return actionFieldDecorator(name).apply(this, arguments);
    };
}
function actionFieldDecorator(name) {
    // Simple property that writes on first invocation to the current instance
    return function (target, prop, descriptor) {
        Object.defineProperty(target, prop, {
            configurable: true,
            enumerable: false,
            get: function () {
                return undefined;
            },
            set: function (value) {
                addHiddenProp(this, prop, action(name, value));
            }
        });
    };
}
function boundActionDecorator(target, propertyName, descriptor, applyToInstance) {
    if (applyToInstance === true) {
        defineBoundAction(target, propertyName, descriptor.value);
        return null;
    }
    if (descriptor) {
        // if (descriptor.value)
        // Typescript / Babel: @action.bound method() { }
        // also: babel @action.bound method = () => {}
        return {
            configurable: true,
            enumerable: false,
            get: function () {
                defineBoundAction(this, propertyName, descriptor.value || descriptor.initializer.call(this));
                return this[propertyName];
            },
            set: dontReassignFields
        };
    }
    // field decorator Typescript @action.bound method = () => {}
    return {
        enumerable: false,
        configurable: true,
        set: function (v) {
            defineBoundAction(this, propertyName, v);
        },
        get: function () {
            return undefined;
        }
    };
}

var action = function action(arg1, arg2, arg3, arg4) {
    // action(fn() {})
    if (arguments.length === 1 && typeof arg1 === "function")
        return createAction(arg1.name || "<unnamed action>", arg1);
    // action("name", fn() {})
    if (arguments.length === 2 && typeof arg2 === "function")
        return createAction(arg1, arg2);
    // @action("name") fn() {}
    if (arguments.length === 1 && typeof arg1 === "string")
        return namedActionDecorator(arg1);
    // @action fn() {}
    if (arg4 === true) {
        // apply to instance immediately
        arg1[arg2] = createAction(arg1.name || arg2, arg3.value);
    }
    else {
        return namedActionDecorator(arg2).apply(null, arguments);
    }
};
action.bound = boundActionDecorator;
function runInAction(arg1, arg2) {
    // TODO: deprecate?
    var actionName = typeof arg1 === "string" ? arg1 : arg1.name || "<unnamed action>";
    var fn = typeof arg1 === "function" ? arg1 : arg2;
    {
        invariant(typeof fn === "function" && fn.length === 0, "`runInAction` expects a function without arguments");
        if (typeof actionName !== "string" || !actionName)
            fail("actions should have valid names, got: '" + actionName + "'");
    }
    return executeAction(actionName, fn, this, undefined);
}
function isAction(thing) {
    return typeof thing === "function" && thing.isMobxAction === true;
}
function defineBoundAction(target, propertyName, fn) {
    addHiddenProp(target, propertyName, createAction(propertyName, fn.bind(target)));
}

/**
 * Creates a named reactive view and keeps it alive, so that the view is always
 * updated if one of the dependencies changes, even when the view is not further used by something else.
 * @param view The reactive view
 * @returns disposer function, which can be used to stop the view from being updated in the future.
 */
function autorun(view, opts) {
    if (opts === void 0) { opts = EMPTY_OBJECT; }
    {
        invariant(typeof view === "function", "Autorun expects a function as first argument");
        invariant(isAction(view) === false, "Autorun does not accept actions since actions are untrackable");
    }
    var name = (opts && opts.name) || view.name || "Autorun@" + getNextId();
    var runSync = !opts.scheduler && !opts.delay;
    var reaction;
    if (runSync) {
        // normal autorun
        reaction = new Reaction(name, function () {
            this.track(reactionRunner);
        }, opts.onError, opts.requiresObservable);
    }
    else {
        var scheduler_1 = createSchedulerFromOptions(opts);
        // debounced autorun
        var isScheduled_1 = false;
        reaction = new Reaction(name, function () {
            if (!isScheduled_1) {
                isScheduled_1 = true;
                scheduler_1(function () {
                    isScheduled_1 = false;
                    if (!reaction.isDisposed)
                        reaction.track(reactionRunner);
                });
            }
        }, opts.onError, opts.requiresObservable);
    }
    function reactionRunner() {
        view(reaction);
    }
    reaction.schedule();
    return reaction.getDisposer();
}
var run = function (f) { return f(); };
function createSchedulerFromOptions(opts) {
    return opts.scheduler
        ? opts.scheduler
        : opts.delay
            ? function (f) { return setTimeout(f, opts.delay); }
            : run;
}
function reaction(expression, effect, opts) {
    if (opts === void 0) { opts = EMPTY_OBJECT; }
    if (typeof opts === "boolean") {
        opts = { fireImmediately: opts };
        deprecated("Using fireImmediately as argument is deprecated. Use '{ fireImmediately: true }' instead");
    }
    {
        invariant(typeof expression === "function", "First argument to reaction should be a function");
        invariant(typeof opts === "object", "Third argument of reactions should be an object");
    }
    var name = opts.name || "Reaction@" + getNextId();
    var effectAction = action(name, opts.onError ? wrapErrorHandler(opts.onError, effect) : effect);
    var runSync = !opts.scheduler && !opts.delay;
    var scheduler = createSchedulerFromOptions(opts);
    var firstTime = true;
    var isScheduled = false;
    var value;
    var equals = opts.compareStructural
        ? comparer.structural
        : opts.equals || comparer.default;
    var r = new Reaction(name, function () {
        if (firstTime || runSync) {
            reactionRunner();
        }
        else if (!isScheduled) {
            isScheduled = true;
            scheduler(reactionRunner);
        }
    }, opts.onError, opts.requiresObservable);
    function reactionRunner() {
        isScheduled = false; // Q: move into reaction runner?
        if (r.isDisposed)
            return;
        var changed = false;
        r.track(function () {
            var nextValue = expression(r);
            changed = firstTime || !equals(value, nextValue);
            value = nextValue;
        });
        if (firstTime && opts.fireImmediately)
            effectAction(value, r);
        if (!firstTime && changed === true)
            effectAction(value, r);
        if (firstTime)
            firstTime = false;
    }
    r.schedule();
    return r.getDisposer();
}
function wrapErrorHandler(errorHandler, baseFn) {
    return function () {
        try {
            return baseFn.apply(this, arguments);
        }
        catch (e) {
            errorHandler.call(this, e);
        }
    };
}

function onBecomeObserved(thing, arg2, arg3) {
    return interceptHook("onBecomeObserved", thing, arg2, arg3);
}
function onBecomeUnobserved(thing, arg2, arg3) {
    return interceptHook("onBecomeUnobserved", thing, arg2, arg3);
}
function interceptHook(hook, thing, arg2, arg3) {
    var atom = typeof arg3 === "function" ? getAtom(thing, arg2) : getAtom(thing);
    var cb = typeof arg3 === "function" ? arg3 : arg2;
    var orig = atom[hook];
    if (typeof orig !== "function")
        return fail("Not an atom that can be (un)observed");
    atom[hook] = function () {
        orig.call(this);
        cb.call(this);
    };
    return function () {
        atom[hook] = orig;
    };
}

function configure(options) {
    var enforceActions = options.enforceActions, computedRequiresReaction = options.computedRequiresReaction, computedConfigurable = options.computedConfigurable, disableErrorBoundaries = options.disableErrorBoundaries, arrayBuffer = options.arrayBuffer, reactionScheduler = options.reactionScheduler, reactionRequiresObservable = options.reactionRequiresObservable, observableRequiresReaction = options.observableRequiresReaction;
    if (options.isolateGlobalState === true) {
        isolateGlobalState();
    }
    if (enforceActions !== undefined) {
        if (typeof enforceActions === "boolean" || enforceActions === "strict")
            deprecated("Deprecated value for 'enforceActions', use 'false' => '\"never\"', 'true' => '\"observed\"', '\"strict\"' => \"'always'\" instead");
        var ea = void 0;
        switch (enforceActions) {
            case true:
            case "observed":
                ea = true;
                break;
            case false:
            case "never":
                ea = false;
                break;
            case "strict":
            case "always":
                ea = "strict";
                break;
            default:
                fail("Invalid value for 'enforceActions': '" + enforceActions + "', expected 'never', 'always' or 'observed'");
        }
        globalState.enforceActions = ea;
        globalState.allowStateChanges = ea === true || ea === "strict" ? false : true;
    }
    if (computedRequiresReaction !== undefined) {
        globalState.computedRequiresReaction = !!computedRequiresReaction;
    }
    if (reactionRequiresObservable !== undefined) {
        globalState.reactionRequiresObservable = !!reactionRequiresObservable;
    }
    if (observableRequiresReaction !== undefined) {
        globalState.observableRequiresReaction = !!observableRequiresReaction;
        globalState.allowStateReads = !globalState.observableRequiresReaction;
    }
    if (computedConfigurable !== undefined) {
        globalState.computedConfigurable = !!computedConfigurable;
    }
    if (disableErrorBoundaries !== undefined) {
        if (disableErrorBoundaries === true)
            console.warn("WARNING: Debug feature only. MobX will NOT recover from errors if this is on.");
        globalState.disableErrorBoundaries = !!disableErrorBoundaries;
    }
    if (typeof arrayBuffer === "number") {
        reserveArrayBuffer(arrayBuffer);
    }
    if (reactionScheduler) {
        setReactionScheduler(reactionScheduler);
    }
}

function decorate(thing, decorators) {
    if (!isPlainObject(decorators))
        fail("Decorators should be a key value map");
    var target = typeof thing === "function" ? thing.prototype : thing;
    var _loop_1 = function (prop) {
        var propertyDecorators = decorators[prop];
        if (!Array.isArray(propertyDecorators)) {
            propertyDecorators = [propertyDecorators];
        }
        // prettier-ignore
        if (!propertyDecorators.every(function (decorator) { return typeof decorator === "function"; }))
            fail("Decorate: expected a decorator function or array of decorator functions for '" + prop + "'");
        var descriptor = Object.getOwnPropertyDescriptor(target, prop);
        var newDescriptor = propertyDecorators.reduce(function (accDescriptor, decorator) { return decorator(target, prop, accDescriptor); }, descriptor);
        if (newDescriptor)
            Object.defineProperty(target, prop, newDescriptor);
    };
    for (var prop in decorators) {
        _loop_1(prop);
    }
    return thing;
}

function extendShallowObservable(target, properties, decorators) {
    deprecated("'extendShallowObservable' is deprecated, use 'extendObservable(target, props, { deep: false })' instead");
    return extendObservable(target, properties, decorators, shallowCreateObservableOptions);
}
function extendObservable(target, properties, decorators, options) {
    {
        invariant(arguments.length >= 2 && arguments.length <= 4, "'extendObservable' expected 2-4 arguments");
        invariant(typeof target === "object", "'extendObservable' expects an object as first argument");
        invariant(!isObservableMap(target), "'extendObservable' should not be used on maps, use map.merge instead");
        invariant(!isObservable(properties), "Extending an object with another observable (object) is not supported. Please construct an explicit propertymap, using `toJS` if need. See issue #540");
        if (decorators)
            for (var key in decorators)
                if (!(key in properties))
                    fail("Trying to declare a decorator for unspecified property '" + key + "'");
    }
    options = asCreateObservableOptions(options);
    var defaultDecorator = options.defaultDecorator || (options.deep === false ? refDecorator : deepDecorator);
    initializeInstance(target);
    asObservableObject(target, options.name, defaultDecorator.enhancer); // make sure object is observable, even without initial props
    startBatch();
    try {
        for (var key in properties) {
            var descriptor = Object.getOwnPropertyDescriptor(properties, key);
            {
                if (isComputed(descriptor.value))
                    fail("Passing a 'computed' as initial property value is no longer supported by extendObservable. Use a getter or decorator instead");
            }
            var decorator = decorators && key in decorators
                ? decorators[key]
                : descriptor.get
                    ? computedDecorator
                    : defaultDecorator;
            if (typeof decorator !== "function")
                return fail("Not a valid decorator for '" + key + "', got: " + decorator);
            var resultDescriptor = decorator(target, key, descriptor, true);
            if (resultDescriptor // otherwise, assume already applied, due to `applyToInstance`
            )
                Object.defineProperty(target, key, resultDescriptor);
        }
    }
    finally {
        endBatch();
    }
    return target;
}

function getDependencyTree(thing, property) {
    return nodeToDependencyTree(getAtom(thing, property));
}
function nodeToDependencyTree(node) {
    var result = {
        name: node.name
    };
    if (node.observing && node.observing.length > 0)
        result.dependencies = unique(node.observing).map(nodeToDependencyTree);
    return result;
}
function getObserverTree(thing, property) {
    return nodeToObserverTree(getAtom(thing, property));
}
function nodeToObserverTree(node) {
    var result = {
        name: node.name
    };
    if (hasObservers(node))
        result.observers = getObservers(node).map(nodeToObserverTree);
    return result;
}

var generatorId = 0;
function FlowCancellationError() {
    this.message = "FLOW_CANCELLED";
}
FlowCancellationError.prototype = Object.create(Error.prototype);
function isFlowCancellationError(error) {
    return error instanceof FlowCancellationError;
}
function flow(generator) {
    if (arguments.length !== 1)
        fail("Flow expects one 1 argument and cannot be used as decorator");
    var name = generator.name || "<unnamed flow>";
    // Implementation based on https://github.com/tj/co/blob/master/index.js
    return function () {
        var ctx = this;
        var args = arguments;
        var runId = ++generatorId;
        var gen = action(name + " - runid: " + runId + " - init", generator).apply(ctx, args);
        var rejector;
        var pendingPromise = undefined;
        var res = new Promise(function (resolve, reject) {
            var stepId = 0;
            rejector = reject;
            function onFulfilled(res) {
                pendingPromise = undefined;
                var ret;
                try {
                    ret = action(name + " - runid: " + runId + " - yield " + stepId++, gen.next).call(gen, res);
                }
                catch (e) {
                    return reject(e);
                }
                next(ret);
            }
            function onRejected(err) {
                pendingPromise = undefined;
                var ret;
                try {
                    ret = action(name + " - runid: " + runId + " - yield " + stepId++, gen.throw).call(gen, err);
                }
                catch (e) {
                    return reject(e);
                }
                next(ret);
            }
            function next(ret) {
                if (ret && typeof ret.then === "function") {
                    // an async iterator
                    ret.then(next, reject);
                    return;
                }
                if (ret.done)
                    return resolve(ret.value);
                pendingPromise = Promise.resolve(ret.value);
                return pendingPromise.then(onFulfilled, onRejected);
            }
            onFulfilled(undefined); // kick off the process
        });
        res.cancel = action(name + " - runid: " + runId + " - cancel", function () {
            try {
                if (pendingPromise)
                    cancelPromise(pendingPromise);
                // Finally block can return (or yield) stuff..
                var res_1 = gen.return(undefined);
                // eat anything that promise would do, it's cancelled!
                var yieldedPromise = Promise.resolve(res_1.value);
                yieldedPromise.then(noop, noop);
                cancelPromise(yieldedPromise); // maybe it can be cancelled :)
                // reject our original promise
                rejector(new FlowCancellationError());
            }
            catch (e) {
                rejector(e); // there could be a throwing finally block
            }
        });
        return res;
    };
}
function cancelPromise(promise) {
    if (typeof promise.cancel === "function")
        promise.cancel();
}

function interceptReads(thing, propOrHandler, handler) {
    var target;
    if (isObservableMap(thing) || isObservableArray(thing) || isObservableValue(thing)) {
        target = getAdministration(thing);
    }
    else if (isObservableObject(thing)) {
        if (typeof propOrHandler !== "string")
            return fail("InterceptReads can only be used with a specific property, not with an object in general");
        target = getAdministration(thing, propOrHandler);
    }
    else {
        return fail("Expected observable map, object or array as first array");
    }
    if (target.dehancer !== undefined)
        return fail("An intercept reader was already established");
    target.dehancer = typeof propOrHandler === "function" ? propOrHandler : handler;
    return function () {
        target.dehancer = undefined;
    };
}

function intercept(thing, propOrHandler, handler) {
    if (typeof handler === "function")
        return interceptProperty(thing, propOrHandler, handler);
    else
        return interceptInterceptable(thing, propOrHandler);
}
function interceptInterceptable(thing, handler) {
    return getAdministration(thing).intercept(handler);
}
function interceptProperty(thing, property, handler) {
    return getAdministration(thing, property).intercept(handler);
}

function _isComputed(value, property) {
    if (value === null || value === undefined)
        return false;
    if (property !== undefined) {
        if (isObservableObject(value) === false)
            return false;
        if (!value.$mobx.values[property])
            return false;
        var atom = getAtom(value, property);
        return isComputedValue(atom);
    }
    return isComputedValue(value);
}
function isComputed(value) {
    if (arguments.length > 1)
        return fail("isComputed expects only 1 argument. Use isObservableProp to inspect the observability of a property");
    return _isComputed(value);
}
function isComputedProp(value, propName) {
    if (typeof propName !== "string")
        return fail("isComputed expected a property name as second argument");
    return _isComputed(value, propName);
}

function _isObservable(value, property) {
    if (value === null || value === undefined)
        return false;
    if (property !== undefined) {
        if (isObservableMap(value) || isObservableArray(value))
            return fail("isObservable(object, propertyName) is not supported for arrays and maps. Use map.has or array.length instead.");
        if (isObservableObject(value)) {
            var o = value.$mobx;
            return o.values && !!o.values[property];
        }
        return false;
    }
    // For first check, see #701
    return (isObservableObject(value) ||
        !!value.$mobx ||
        isAtom(value) ||
        isReaction(value) ||
        isComputedValue(value));
}
function isObservable(value) {
    if (arguments.length !== 1)
        fail("isObservable expects only 1 argument. Use isObservableProp to inspect the observability of a property");
    return _isObservable(value);
}
function isObservableProp(value, propName) {
    if (typeof propName !== "string")
        return fail("expected a property name as second argument");
    return _isObservable(value, propName);
}

function keys(obj) {
    if (isObservableObject(obj)) {
        return obj.$mobx.getKeys();
    }
    if (isObservableMap(obj)) {
        return obj._keys.slice();
    }
    if (isObservableSet(obj)) {
        return iteratorToArray(obj.keys());
    }
    if (isObservableArray(obj)) {
        return obj.map(function (_, index) { return index; });
    }
    return fail("'keys()' can only be used on observable objects, arrays, sets and maps");
}
function values(obj) {
    if (isObservableObject(obj)) {
        return keys(obj).map(function (key) { return obj[key]; });
    }
    if (isObservableMap(obj)) {
        return keys(obj).map(function (key) { return obj.get(key); });
    }
    if (isObservableSet(obj)) {
        return iteratorToArray(obj.values());
    }
    if (isObservableArray(obj)) {
        return obj.slice();
    }
    return fail("'values()' can only be used on observable objects, arrays, sets and maps");
}
function entries(obj) {
    if (isObservableObject(obj)) {
        return keys(obj).map(function (key) { return [key, obj[key]]; });
    }
    if (isObservableMap(obj)) {
        return keys(obj).map(function (key) { return [key, obj.get(key)]; });
    }
    if (isObservableSet(obj)) {
        return iteratorToArray(obj.entries());
    }
    if (isObservableArray(obj)) {
        return obj.map(function (key, index) { return [index, key]; });
    }
    return fail("'entries()' can only be used on observable objects, arrays and maps");
}
function set(obj, key, value) {
    if (arguments.length === 2 && !isObservableSet(obj)) {
        startBatch();
        var values_1 = key;
        try {
            for (var key_1 in values_1)
                set(obj, key_1, values_1[key_1]);
        }
        finally {
            endBatch();
        }
        return;
    }
    if (isObservableObject(obj)) {
        var adm = obj.$mobx;
        var existingObservable = adm.values[key];
        if (existingObservable) {
            adm.write(obj, key, value);
        }
        else {
            defineObservableProperty(obj, key, value, adm.defaultEnhancer);
        }
    }
    else if (isObservableMap(obj)) {
        obj.set(key, value);
    }
    else if (isObservableSet(obj)) {
        obj.add(key);
    }
    else if (isObservableArray(obj)) {
        if (typeof key !== "number")
            key = parseInt(key, 10);
        invariant(key >= 0, "Not a valid index: '" + key + "'");
        startBatch();
        if (key >= obj.length)
            obj.length = key + 1;
        obj[key] = value;
        endBatch();
    }
    else {
        return fail("'set()' can only be used on observable objects, arrays and maps");
    }
}
function remove(obj, key) {
    if (isObservableObject(obj)) {
        obj.$mobx.remove(key);
    }
    else if (isObservableMap(obj)) {
        obj.delete(key);
    }
    else if (isObservableSet(obj)) {
        obj.delete(key);
    }
    else if (isObservableArray(obj)) {
        if (typeof key !== "number")
            key = parseInt(key, 10);
        invariant(key >= 0, "Not a valid index: '" + key + "'");
        obj.splice(key, 1);
    }
    else {
        return fail("'remove()' can only be used on observable objects, arrays and maps");
    }
}
function has(obj, key) {
    if (isObservableObject(obj)) {
        // return keys(obj).indexOf(key) >= 0
        var adm = getAdministration(obj);
        adm.getKeys(); // make sure we get notified of key changes, but for performance, use the values map to look up existence
        return !!adm.values[key];
    }
    else if (isObservableMap(obj)) {
        return obj.has(key);
    }
    else if (isObservableSet(obj)) {
        return obj.has(key);
    }
    else if (isObservableArray(obj)) {
        return key >= 0 && key < obj.length;
    }
    else {
        return fail("'has()' can only be used on observable objects, arrays and maps");
    }
}
function get(obj, key) {
    if (!has(obj, key))
        return undefined;
    if (isObservableObject(obj)) {
        return obj[key];
    }
    else if (isObservableMap(obj)) {
        return obj.get(key);
    }
    else if (isObservableArray(obj)) {
        return obj[key];
    }
    else {
        return fail("'get()' can only be used on observable objects, arrays and maps");
    }
}

function observe(thing, propOrCb, cbOrFire, fireImmediately) {
    if (typeof cbOrFire === "function")
        return observeObservableProperty(thing, propOrCb, cbOrFire, fireImmediately);
    else
        return observeObservable(thing, propOrCb, cbOrFire);
}
function observeObservable(thing, listener, fireImmediately) {
    return getAdministration(thing).observe(listener, fireImmediately);
}
function observeObservableProperty(thing, property, listener, fireImmediately) {
    return getAdministration(thing, property).observe(listener, fireImmediately);
}

var defaultOptions = {
    detectCycles: true,
    exportMapsAsObjects: true,
    recurseEverything: false
};
function cache(map, key, value, options) {
    if (options.detectCycles)
        map.set(key, value);
    return value;
}
function toJSHelper(source, options, __alreadySeen) {
    if (!options.recurseEverything && !isObservable(source))
        return source;
    if (typeof source !== "object")
        return source;
    // Directly return null if source is null
    if (source === null)
        return null;
    // Directly return the Date object itself if contained in the observable
    if (source instanceof Date)
        return source;
    if (isObservableValue(source))
        return toJSHelper(source.get(), options, __alreadySeen);
    // make sure we track the keys of the object
    if (isObservable(source))
        keys(source);
    var detectCycles = options.detectCycles === true;
    if (detectCycles && source !== null && __alreadySeen.has(source)) {
        return __alreadySeen.get(source);
    }
    if (isObservableArray(source) || Array.isArray(source)) {
        var res_1 = cache(__alreadySeen, source, [], options);
        var toAdd = source.map(function (value) { return toJSHelper(value, options, __alreadySeen); });
        res_1.length = toAdd.length;
        for (var i = 0, l = toAdd.length; i < l; i++)
            res_1[i] = toAdd[i];
        return res_1;
    }
    if (isObservableSet(source) || Object.getPrototypeOf(source) === Set.prototype) {
        if (options.exportMapsAsObjects === false) {
            var res_2 = cache(__alreadySeen, source, new Set(), options);
            source.forEach(function (value) {
                res_2.add(toJSHelper(value, options, __alreadySeen));
            });
            return res_2;
        }
        else {
            var res_3 = cache(__alreadySeen, source, [], options);
            source.forEach(function (value) {
                res_3.push(toJSHelper(value, options, __alreadySeen));
            });
            return res_3;
        }
    }
    if (isObservableMap(source) || Object.getPrototypeOf(source) === Map.prototype) {
        if (options.exportMapsAsObjects === false) {
            var res_4 = cache(__alreadySeen, source, new Map(), options);
            source.forEach(function (value, key) {
                res_4.set(key, toJSHelper(value, options, __alreadySeen));
            });
            return res_4;
        }
        else {
            var res_5 = cache(__alreadySeen, source, {}, options);
            source.forEach(function (value, key) {
                res_5[key] = toJSHelper(value, options, __alreadySeen);
            });
            return res_5;
        }
    }
    // Fallback to the situation that source is an ObservableObject or a plain object
    var res = cache(__alreadySeen, source, {}, options);
    for (var key in source) {
        res[key] = toJSHelper(source[key], options, __alreadySeen);
    }
    return res;
}
function toJS(source, options) {
    // backward compatibility
    if (typeof options === "boolean")
        options = { detectCycles: options };
    if (!options)
        options = defaultOptions;
    options.detectCycles =
        options.detectCycles === undefined
            ? options.recurseEverything === true
            : options.detectCycles === true;
    var __alreadySeen;
    if (options.detectCycles)
        __alreadySeen = new Map();
    return toJSHelper(source, options, __alreadySeen);
}

function trace() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var enterBreakPoint = false;
    if (typeof args[args.length - 1] === "boolean")
        enterBreakPoint = args.pop();
    var derivation = getAtomFromArgs(args);
    if (!derivation) {
        return fail("'trace(break?)' can only be used inside a tracked computed value or a Reaction. Consider passing in the computed value or reaction explicitly");
    }
    if (derivation.isTracing === TraceMode.NONE) {
        console.log("[mobx.trace] '" + derivation.name + "' tracing enabled");
    }
    derivation.isTracing = enterBreakPoint ? TraceMode.BREAK : TraceMode.LOG;
}
function getAtomFromArgs(args) {
    switch (args.length) {
        case 0:
            return globalState.trackingDerivation;
        case 1:
            return getAtom(args[0]);
        case 2:
            return getAtom(args[0], args[1]);
    }
}

/**
 * During a transaction no views are updated until the end of the transaction.
 * The transaction will be run synchronously nonetheless.
 *
 * @param action a function that updates some reactive state
 * @returns any value that was returned by the 'action' parameter.
 */
function transaction(action, thisArg) {
    if (thisArg === void 0) { thisArg = undefined; }
    startBatch();
    try {
        return action.apply(thisArg);
    }
    finally {
        endBatch();
    }
}

function when(predicate, arg1, arg2) {
    if (arguments.length === 1 || (arg1 && typeof arg1 === "object"))
        return whenPromise(predicate, arg1);
    return _when(predicate, arg1, arg2 || {});
}
function _when(predicate, effect, opts) {
    var timeoutHandle;
    if (typeof opts.timeout === "number") {
        timeoutHandle = setTimeout(function () {
            if (!disposer.$mobx.isDisposed) {
                disposer();
                var error = new Error("WHEN_TIMEOUT");
                if (opts.onError)
                    opts.onError(error);
                else
                    throw error;
            }
        }, opts.timeout);
    }
    opts.name = opts.name || "When@" + getNextId();
    var effectAction = createAction(opts.name + "-effect", effect);
    var disposer = autorun(function (r) {
        if (predicate()) {
            r.dispose();
            if (timeoutHandle)
                clearTimeout(timeoutHandle);
            effectAction();
        }
    }, opts);
    return disposer;
}
function whenPromise(predicate, opts) {
    if (opts && opts.onError)
        return fail("the options 'onError' and 'promise' cannot be combined");
    var cancel;
    var res = new Promise(function (resolve, reject) {
        var disposer = _when(predicate, resolve, __assign(__assign({}, opts), { onError: reject }));
        cancel = function () {
            disposer();
            reject("WHEN_CANCELLED");
        };
    });
    res.cancel = cancel;
    return res;
}

function hasInterceptors(interceptable) {
    return interceptable.interceptors !== undefined && interceptable.interceptors.length > 0;
}
function registerInterceptor(interceptable, handler) {
    var interceptors = interceptable.interceptors || (interceptable.interceptors = []);
    interceptors.push(handler);
    return once(function () {
        var idx = interceptors.indexOf(handler);
        if (idx !== -1)
            interceptors.splice(idx, 1);
    });
}
function interceptChange(interceptable, change) {
    var prevU = untrackedStart();
    try {
        var interceptors = interceptable.interceptors;
        if (interceptors)
            for (var i = 0, l = interceptors.length; i < l; i++) {
                change = interceptors[i](change);
                invariant(!change || change.type, "Intercept handlers should return nothing or a change object");
                if (!change)
                    break;
            }
        return change;
    }
    finally {
        untrackedEnd(prevU);
    }
}

function hasListeners(listenable) {
    return listenable.changeListeners !== undefined && listenable.changeListeners.length > 0;
}
function registerListener(listenable, handler) {
    var listeners = listenable.changeListeners || (listenable.changeListeners = []);
    listeners.push(handler);
    return once(function () {
        var idx = listeners.indexOf(handler);
        if (idx !== -1)
            listeners.splice(idx, 1);
    });
}
function notifyListeners(listenable, change) {
    var prevU = untrackedStart();
    var listeners = listenable.changeListeners;
    if (!listeners)
        return;
    listeners = listeners.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
        listeners[i](change);
    }
    untrackedEnd(prevU);
}

var MAX_SPLICE_SIZE = 10000; // See e.g. https://github.com/mobxjs/mobx/issues/859
// Detects bug in safari 9.1.1 (or iOS 9 safari mobile). See #364
var safariPrototypeSetterInheritanceBug = (function () {
    var v = false;
    var p = {};
    Object.defineProperty(p, "0", {
        set: function () {
            v = true;
        }
    });
    Object.create(p)["0"] = 1;
    return v === false;
})();
/**
 * This array buffer contains two lists of properties, so that all arrays
 * can recycle their property definitions, which significantly improves performance of creating
 * properties on the fly.
 */
var OBSERVABLE_ARRAY_BUFFER_SIZE = 0;
// Typescript workaround to make sure ObservableArray extends Array
var StubArray = /** @class */ (function () {
    function StubArray() {
    }
    return StubArray;
}());
function inherit(ctor, proto) {
    if (typeof Object["setPrototypeOf"] !== "undefined") {
        Object["setPrototypeOf"](ctor.prototype, proto);
    }
    else if (typeof ctor.prototype.__proto__ !== "undefined") {
        ctor.prototype.__proto__ = proto;
    }
    else {
        ctor["prototype"] = proto;
    }
}
inherit(StubArray, Array.prototype);
// Weex freeze Array.prototype
// Make them writeable and configurable in prototype chain
// https://github.com/alibaba/weex/pull/1529
if (Object.isFrozen(Array)) {
    [
        "constructor",
        "push",
        "shift",
        "concat",
        "pop",
        "unshift",
        "replace",
        "find",
        "findIndex",
        "splice",
        "reverse",
        "sort"
    ].forEach(function (key) {
        Object.defineProperty(StubArray.prototype, key, {
            configurable: true,
            writable: true,
            value: Array.prototype[key]
        });
    });
}
var ObservableArrayAdministration = /** @class */ (function () {
    function ObservableArrayAdministration(name, enhancer, array, owned) {
        this.array = array;
        this.owned = owned;
        this.values = [];
        this.lastKnownLength = 0;
        this.atom = new Atom(name || "ObservableArray@" + getNextId());
        this.enhancer = function (newV, oldV) { return enhancer(newV, oldV, name + "[..]"); };
    }
    ObservableArrayAdministration.prototype.dehanceValue = function (value) {
        if (this.dehancer !== undefined)
            return this.dehancer(value);
        return value;
    };
    ObservableArrayAdministration.prototype.dehanceValues = function (values) {
        if (this.dehancer !== undefined && values.length > 0)
            return values.map(this.dehancer);
        return values;
    };
    ObservableArrayAdministration.prototype.intercept = function (handler) {
        return registerInterceptor(this, handler);
    };
    ObservableArrayAdministration.prototype.observe = function (listener, fireImmediately) {
        if (fireImmediately === void 0) { fireImmediately = false; }
        if (fireImmediately) {
            listener({
                object: this.array,
                type: "splice",
                index: 0,
                added: this.values.slice(),
                addedCount: this.values.length,
                removed: [],
                removedCount: 0
            });
        }
        return registerListener(this, listener);
    };
    ObservableArrayAdministration.prototype.getArrayLength = function () {
        this.atom.reportObserved();
        return this.values.length;
    };
    ObservableArrayAdministration.prototype.setArrayLength = function (newLength) {
        if (typeof newLength !== "number" || newLength < 0)
            throw new Error("[mobx.array] Out of range: " + newLength);
        var currentLength = this.values.length;
        if (newLength === currentLength)
            return;
        else if (newLength > currentLength) {
            var newItems = new Array(newLength - currentLength);
            for (var i = 0; i < newLength - currentLength; i++)
                newItems[i] = undefined; // No Array.fill everywhere...
            this.spliceWithArray(currentLength, 0, newItems);
        }
        else
            this.spliceWithArray(newLength, currentLength - newLength);
    };
    // adds / removes the necessary numeric properties to this object
    ObservableArrayAdministration.prototype.updateArrayLength = function (oldLength, delta) {
        if (oldLength !== this.lastKnownLength)
            throw new Error("[mobx] Modification exception: the internal structure of an observable array was changed. Did you use peek() to change it?");
        this.lastKnownLength += delta;
        if (delta > 0 && oldLength + delta + 1 > OBSERVABLE_ARRAY_BUFFER_SIZE)
            reserveArrayBuffer(oldLength + delta + 1);
    };
    ObservableArrayAdministration.prototype.spliceWithArray = function (index, deleteCount, newItems) {
        var _this = this;
        checkIfStateModificationsAreAllowed(this.atom);
        var length = this.values.length;
        if (index === undefined)
            index = 0;
        else if (index > length)
            index = length;
        else if (index < 0)
            index = Math.max(0, length + index);
        if (arguments.length === 1)
            deleteCount = length - index;
        else if (deleteCount === undefined || deleteCount === null)
            deleteCount = 0;
        else
            deleteCount = Math.max(0, Math.min(deleteCount, length - index));
        if (newItems === undefined)
            newItems = EMPTY_ARRAY;
        if (hasInterceptors(this)) {
            var change = interceptChange(this, {
                object: this.array,
                type: "splice",
                index: index,
                removedCount: deleteCount,
                added: newItems
            });
            if (!change)
                return EMPTY_ARRAY;
            deleteCount = change.removedCount;
            newItems = change.added;
        }
        newItems =
            newItems.length === 0 ? newItems : newItems.map(function (v) { return _this.enhancer(v, undefined); });
        var lengthDelta = newItems.length - deleteCount;
        this.updateArrayLength(length, lengthDelta); // create or remove new entries
        var res = this.spliceItemsIntoValues(index, deleteCount, newItems);
        if (deleteCount !== 0 || newItems.length !== 0)
            this.notifyArraySplice(index, newItems, res);
        return this.dehanceValues(res);
    };
    ObservableArrayAdministration.prototype.spliceItemsIntoValues = function (index, deleteCount, newItems) {
        var _a;
        if (newItems.length < MAX_SPLICE_SIZE) {
            return (_a = this.values).splice.apply(_a, __spread([index, deleteCount], newItems));
        }
        else {
            var res = this.values.slice(index, index + deleteCount);
            this.values = this.values
                .slice(0, index)
                .concat(newItems, this.values.slice(index + deleteCount));
            return res;
        }
    };
    ObservableArrayAdministration.prototype.notifyArrayChildUpdate = function (index, newValue, oldValue) {
        var notifySpy = !this.owned && isSpyEnabled();
        var notify = hasListeners(this);
        var change = notify || notifySpy
            ? {
                object: this.array,
                type: "update",
                index: index,
                newValue: newValue,
                oldValue: oldValue
            }
            : null;
        if (notifySpy)
            spyReportStart(__assign(__assign({}, change), { name: this.atom.name }));
        this.atom.reportChanged();
        if (notify)
            notifyListeners(this, change);
        if (notifySpy)
            spyReportEnd();
    };
    ObservableArrayAdministration.prototype.notifyArraySplice = function (index, added, removed) {
        var notifySpy = !this.owned && isSpyEnabled();
        var notify = hasListeners(this);
        var change = notify || notifySpy
            ? {
                object: this.array,
                type: "splice",
                index: index,
                removed: removed,
                added: added,
                removedCount: removed.length,
                addedCount: added.length
            }
            : null;
        if (notifySpy)
            spyReportStart(__assign(__assign({}, change), { name: this.atom.name }));
        this.atom.reportChanged();
        // conform: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
        if (notify)
            notifyListeners(this, change);
        if (notifySpy)
            spyReportEnd();
    };
    return ObservableArrayAdministration;
}());
var ObservableArray = /** @class */ (function (_super) {
    __extends(ObservableArray, _super);
    function ObservableArray(initialValues, enhancer, name, owned) {
        if (name === void 0) { name = "ObservableArray@" + getNextId(); }
        if (owned === void 0) { owned = false; }
        var _this = _super.call(this) || this;
        var adm = new ObservableArrayAdministration(name, enhancer, _this, owned);
        addHiddenFinalProp(_this, "$mobx", adm);
        if (initialValues && initialValues.length) {
            var prev = allowStateChangesStart(true);
            _this.spliceWithArray(0, 0, initialValues);
            allowStateChangesEnd(prev);
        }
        if (safariPrototypeSetterInheritanceBug) {
            // Seems that Safari won't use numeric prototype setter untill any * numeric property is
            // defined on the instance. After that it works fine, even if this property is deleted.
            Object.defineProperty(adm.array, "0", ENTRY_0);
        }
        return _this;
    }
    ObservableArray.prototype.intercept = function (handler) {
        return this.$mobx.intercept(handler);
    };
    ObservableArray.prototype.observe = function (listener, fireImmediately) {
        if (fireImmediately === void 0) { fireImmediately = false; }
        return this.$mobx.observe(listener, fireImmediately);
    };
    ObservableArray.prototype.clear = function () {
        return this.splice(0);
    };
    ObservableArray.prototype.concat = function () {
        var arrays = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            arrays[_i] = arguments[_i];
        }
        this.$mobx.atom.reportObserved();
        return Array.prototype.concat.apply(this.peek(), arrays.map(function (a) { return (isObservableArray(a) ? a.peek() : a); }));
    };
    ObservableArray.prototype.replace = function (newItems) {
        return this.$mobx.spliceWithArray(0, this.$mobx.values.length, newItems);
    };
    /**
     * Converts this array back to a (shallow) javascript structure.
     * For a deep clone use mobx.toJS
     */
    ObservableArray.prototype.toJS = function () {
        return this.slice();
    };
    ObservableArray.prototype.toJSON = function () {
        // Used by JSON.stringify
        return this.toJS();
    };
    ObservableArray.prototype.peek = function () {
        this.$mobx.atom.reportObserved();
        return this.$mobx.dehanceValues(this.$mobx.values);
    };
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
    ObservableArray.prototype.find = function (predicate, thisArg, fromIndex) {
        if (fromIndex === void 0) { fromIndex = 0; }
        if (arguments.length === 3)
            deprecated("The array.find fromIndex argument to find will not be supported anymore in the next major");
        var idx = this.findIndex.apply(this, arguments);
        return idx === -1 ? undefined : this.get(idx);
    };
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex
    ObservableArray.prototype.findIndex = function (predicate, thisArg, fromIndex) {
        if (fromIndex === void 0) { fromIndex = 0; }
        if (arguments.length === 3)
            deprecated("The array.findIndex fromIndex argument to find will not be supported anymore in the next major");
        var items = this.peek(), l = items.length;
        for (var i = fromIndex; i < l; i++)
            if (predicate.call(thisArg, items[i], i, this))
                return i;
        return -1;
    };
    /*
     * functions that do alter the internal structure of the array, (based on lib.es6.d.ts)
     * since these functions alter the inner structure of the array, the have side effects.
     * Because the have side effects, they should not be used in computed function,
     * and for that reason the do not call dependencyState.notifyObserved
     */
    ObservableArray.prototype.splice = function (index, deleteCount) {
        var newItems = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            newItems[_i - 2] = arguments[_i];
        }
        switch (arguments.length) {
            case 0:
                return [];
            case 1:
                return this.$mobx.spliceWithArray(index);
            case 2:
                return this.$mobx.spliceWithArray(index, deleteCount);
        }
        return this.$mobx.spliceWithArray(index, deleteCount, newItems);
    };
    ObservableArray.prototype.spliceWithArray = function (index, deleteCount, newItems) {
        return this.$mobx.spliceWithArray(index, deleteCount, newItems);
    };
    ObservableArray.prototype.push = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i] = arguments[_i];
        }
        var adm = this.$mobx;
        adm.spliceWithArray(adm.values.length, 0, items);
        return adm.values.length;
    };
    ObservableArray.prototype.pop = function () {
        return this.splice(Math.max(this.$mobx.values.length - 1, 0), 1)[0];
    };
    ObservableArray.prototype.shift = function () {
        return this.splice(0, 1)[0];
    };
    ObservableArray.prototype.unshift = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i] = arguments[_i];
        }
        var adm = this.$mobx;
        adm.spliceWithArray(0, 0, items);
        return adm.values.length;
    };
    ObservableArray.prototype.reverse = function () {
        // reverse by default mutates in place before returning the result
        // which makes it both a 'derivation' and a 'mutation'.
        // so we deviate from the default and just make it an dervitation
        var clone = this.slice();
        return clone.reverse.apply(clone, arguments);
    };
    ObservableArray.prototype.sort = function (compareFn) {
        // sort by default mutates in place before returning the result
        // which goes against all good practices. Let's not change the array in place!
        var clone = this.slice();
        return clone.sort.apply(clone, arguments);
    };
    ObservableArray.prototype.remove = function (value) {
        var idx = this.$mobx.dehanceValues(this.$mobx.values).indexOf(value);
        if (idx > -1) {
            this.splice(idx, 1);
            return true;
        }
        return false;
    };
    ObservableArray.prototype.move = function (fromIndex, toIndex) {
        deprecated("observableArray.move is deprecated, use .slice() & .replace() instead");
        function checkIndex(index) {
            if (index < 0) {
                throw new Error("[mobx.array] Index out of bounds: " + index + " is negative");
            }
            var length = this.$mobx.values.length;
            if (index >= length) {
                throw new Error("[mobx.array] Index out of bounds: " + index + " is not smaller than " + length);
            }
        }
        checkIndex.call(this, fromIndex);
        checkIndex.call(this, toIndex);
        if (fromIndex === toIndex) {
            return;
        }
        var oldItems = this.$mobx.values;
        var newItems;
        if (fromIndex < toIndex) {
            newItems = __spread(oldItems.slice(0, fromIndex), oldItems.slice(fromIndex + 1, toIndex + 1), [
                oldItems[fromIndex]
            ], oldItems.slice(toIndex + 1));
        }
        else {
            // toIndex < fromIndex
            newItems = __spread(oldItems.slice(0, toIndex), [
                oldItems[fromIndex]
            ], oldItems.slice(toIndex, fromIndex), oldItems.slice(fromIndex + 1));
        }
        this.replace(newItems);
    };
    // See #734, in case property accessors are unreliable...
    ObservableArray.prototype.get = function (index) {
        var impl = this.$mobx;
        if (impl) {
            if (index < impl.values.length) {
                impl.atom.reportObserved();
                return impl.dehanceValue(impl.values[index]);
            }
            console.warn("[mobx.array] Attempt to read an array index (" + index + ") that is out of bounds (" + impl.values.length + "). Please check length first. Out of bound indices will not be tracked by MobX");
        }
        return undefined;
    };
    // See #734, in case property accessors are unreliable...
    ObservableArray.prototype.set = function (index, newValue) {
        var adm = this.$mobx;
        var values = adm.values;
        if (index < values.length) {
            // update at index in range
            checkIfStateModificationsAreAllowed(adm.atom);
            var oldValue = values[index];
            if (hasInterceptors(adm)) {
                var change = interceptChange(adm, {
                    type: "update",
                    object: this,
                    index: index,
                    newValue: newValue
                });
                if (!change)
                    return;
                newValue = change.newValue;
            }
            newValue = adm.enhancer(newValue, oldValue);
            var changed = newValue !== oldValue;
            if (changed) {
                values[index] = newValue;
                adm.notifyArrayChildUpdate(index, newValue, oldValue);
            }
        }
        else if (index === values.length) {
            // add a new item
            adm.spliceWithArray(index, 0, [newValue]);
        }
        else {
            // out of bounds
            throw new Error("[mobx.array] Index out of bounds, " + index + " is larger than " + values.length);
        }
    };
    return ObservableArray;
}(StubArray));
declareIterator(ObservableArray.prototype, function () {
    this.$mobx.atom.reportObserved();
    var self = this;
    var nextIndex = 0;
    return makeIterable({
        next: function () {
            return nextIndex < self.length
                ? { value: self[nextIndex++], done: false }
                : { done: true, value: undefined };
        }
    });
});
Object.defineProperty(ObservableArray.prototype, "length", {
    enumerable: false,
    configurable: true,
    get: function () {
        return this.$mobx.getArrayLength();
    },
    set: function (newLength) {
        this.$mobx.setArrayLength(newLength);
    }
});
addHiddenProp(ObservableArray.prototype, toStringTagSymbol(), "Array");
[
    "every",
    "filter",
    "forEach",
    "indexOf",
    "join",
    "lastIndexOf",
    "map",
    "reduce",
    "reduceRight",
    "slice",
    "some",
    "toString",
    "toLocaleString"
].forEach(function (funcName) {
    var baseFunc = Array.prototype[funcName];
    invariant(typeof baseFunc === "function", "Base function not defined on Array prototype: '" + funcName + "'");
    addHiddenProp(ObservableArray.prototype, funcName, function () {
        return baseFunc.apply(this.peek(), arguments);
    });
});
/**
 * We don't want those to show up in `for (const key in ar)` ...
 */
makeNonEnumerable(ObservableArray.prototype, [
    "constructor",
    "intercept",
    "observe",
    "clear",
    "concat",
    "get",
    "replace",
    "toJS",
    "toJSON",
    "peek",
    "find",
    "findIndex",
    "splice",
    "spliceWithArray",
    "push",
    "pop",
    "set",
    "shift",
    "unshift",
    "reverse",
    "sort",
    "remove",
    "move",
    "toString",
    "toLocaleString"
]);
// See #364
var ENTRY_0 = createArrayEntryDescriptor(0);
function createArrayEntryDescriptor(index) {
    return {
        enumerable: false,
        configurable: false,
        get: function () {
            return this.get(index);
        },
        set: function (value) {
            this.set(index, value);
        }
    };
}
function createArrayBufferItem(index) {
    Object.defineProperty(ObservableArray.prototype, "" + index, createArrayEntryDescriptor(index));
}
function reserveArrayBuffer(max) {
    for (var index = OBSERVABLE_ARRAY_BUFFER_SIZE; index < max; index++)
        createArrayBufferItem(index);
    OBSERVABLE_ARRAY_BUFFER_SIZE = max;
}
reserveArrayBuffer(1000);
var isObservableArrayAdministration = createInstanceofPredicate("ObservableArrayAdministration", ObservableArrayAdministration);
function isObservableArray(thing) {
    return isObject(thing) && isObservableArrayAdministration(thing.$mobx);
}

var ObservableMapMarker = {};
var ObservableMap = /** @class */ (function () {
    function ObservableMap(initialData, enhancer, name) {
        if (enhancer === void 0) { enhancer = deepEnhancer; }
        if (name === void 0) { name = "ObservableMap@" + getNextId(); }
        this.enhancer = enhancer;
        this.name = name;
        this.$mobx = ObservableMapMarker;
        this._keys = (new ObservableArray(undefined, referenceEnhancer, this.name + ".keys()", true));
        if (typeof Map !== "function") {
            throw new Error("mobx.map requires Map polyfill for the current browser. Check babel-polyfill or core-js/es6/map.js");
        }
        this._data = new Map();
        this._hasMap = new Map();
        this.merge(initialData);
    }
    ObservableMap.prototype._has = function (key) {
        return this._data.has(key);
    };
    ObservableMap.prototype.has = function (key) {
        var _this = this;
        if (!globalState.trackingDerivation)
            return this._has(key);
        var entry = this._hasMap.get(key);
        if (!entry) {
            // todo: replace with atom (breaking change)
            var newEntry = (entry = new ObservableValue(this._has(key), referenceEnhancer, this.name + "." + stringifyKey(key) + "?", false));
            this._hasMap.set(key, newEntry);
            onBecomeUnobserved(newEntry, function () { return _this._hasMap.delete(key); });
        }
        return entry.get();
    };
    ObservableMap.prototype.set = function (key, value) {
        var hasKey = this._has(key);
        if (hasInterceptors(this)) {
            var change = interceptChange(this, {
                type: hasKey ? "update" : "add",
                object: this,
                newValue: value,
                name: key
            });
            if (!change)
                return this;
            value = change.newValue;
        }
        if (hasKey) {
            this._updateValue(key, value);
        }
        else {
            this._addValue(key, value);
        }
        return this;
    };
    ObservableMap.prototype.delete = function (key) {
        var _this = this;
        if (hasInterceptors(this)) {
            var change = interceptChange(this, {
                type: "delete",
                object: this,
                name: key
            });
            if (!change)
                return false;
        }
        if (this._has(key)) {
            var notifySpy = isSpyEnabled();
            var notify = hasListeners(this);
            var change = notify || notifySpy
                ? {
                    type: "delete",
                    object: this,
                    oldValue: this._data.get(key).value,
                    name: key
                }
                : null;
            if (notifySpy)
                spyReportStart(__assign(__assign({}, change), { name: this.name, key: key }));
            transaction(function () {
                _this._keys.remove(key);
                _this._updateHasMapEntry(key, false);
                var observable = _this._data.get(key);
                observable.setNewValue(undefined);
                _this._data.delete(key);
            });
            if (notify)
                notifyListeners(this, change);
            if (notifySpy)
                spyReportEnd();
            return true;
        }
        return false;
    };
    ObservableMap.prototype._updateHasMapEntry = function (key, value) {
        var entry = this._hasMap.get(key);
        if (entry) {
            entry.setNewValue(value);
        }
    };
    ObservableMap.prototype._updateValue = function (key, newValue) {
        var observable = this._data.get(key);
        newValue = observable.prepareNewValue(newValue);
        if (newValue !== globalState.UNCHANGED) {
            var notifySpy = isSpyEnabled();
            var notify = hasListeners(this);
            var change = notify || notifySpy
                ? {
                    type: "update",
                    object: this,
                    oldValue: observable.value,
                    name: key,
                    newValue: newValue
                }
                : null;
            if (notifySpy)
                spyReportStart(__assign(__assign({}, change), { name: this.name, key: key }));
            observable.setNewValue(newValue);
            if (notify)
                notifyListeners(this, change);
            if (notifySpy)
                spyReportEnd();
        }
    };
    ObservableMap.prototype._addValue = function (key, newValue) {
        var _this = this;
        transaction(function () {
            var observable = new ObservableValue(newValue, _this.enhancer, _this.name + "." + stringifyKey(key), false);
            _this._data.set(key, observable);
            newValue = observable.value; // value might have been changed
            _this._updateHasMapEntry(key, true);
            _this._keys.push(key);
        });
        var notifySpy = isSpyEnabled();
        var notify = hasListeners(this);
        var change = notify || notifySpy
            ? {
                type: "add",
                object: this,
                name: key,
                newValue: newValue
            }
            : null;
        if (notifySpy)
            spyReportStart(__assign(__assign({}, change), { name: this.name, key: key }));
        if (notify)
            notifyListeners(this, change);
        if (notifySpy)
            spyReportEnd();
    };
    ObservableMap.prototype.get = function (key) {
        if (this.has(key))
            return this.dehanceValue(this._data.get(key).get());
        return this.dehanceValue(undefined);
    };
    ObservableMap.prototype.dehanceValue = function (value) {
        if (this.dehancer !== undefined) {
            return this.dehancer(value);
        }
        return value;
    };
    ObservableMap.prototype.keys = function () {
        return this._keys[iteratorSymbol()]();
    };
    ObservableMap.prototype.values = function () {
        var self = this;
        var nextIndex = 0;
        return makeIterable({
            next: function () {
                return nextIndex < self._keys.length
                    ? { value: self.get(self._keys[nextIndex++]), done: false }
                    : { value: undefined, done: true };
            }
        });
    };
    ObservableMap.prototype.entries = function () {
        var self = this;
        var nextIndex = 0;
        return makeIterable({
            next: function () {
                if (nextIndex < self._keys.length) {
                    var key = self._keys[nextIndex++];
                    return {
                        value: [key, self.get(key)],
                        done: false
                    };
                }
                return { done: true };
            }
        });
    };
    ObservableMap.prototype.forEach = function (callback, thisArg) {
        var _this = this;
        this._keys.forEach(function (key) { return callback.call(thisArg, _this.get(key), key, _this); });
    };
    /** Merge another object into this object, returns this. */
    ObservableMap.prototype.merge = function (other) {
        var _this = this;
        if (isObservableMap(other)) {
            other = other.toJS();
        }
        transaction(function () {
            if (isPlainObject(other))
                Object.keys(other).forEach(function (key) { return _this.set(key, other[key]); });
            else if (Array.isArray(other))
                other.forEach(function (_a) {
                    var _b = __read(_a, 2), key = _b[0], value = _b[1];
                    return _this.set(key, value);
                });
            else if (isES6Map(other)) {
                if (other.constructor !== Map)
                    fail("Cannot initialize from classes that inherit from Map: " + other.constructor.name); // prettier-ignore
                else
                    other.forEach(function (value, key) { return _this.set(key, value); });
            }
            else if (other !== null && other !== undefined)
                fail("Cannot initialize map from " + other);
        });
        return this;
    };
    ObservableMap.prototype.clear = function () {
        var _this = this;
        transaction(function () {
            untracked(function () {
                _this._keys.slice().forEach(function (key) { return _this.delete(key); });
            });
        });
    };
    ObservableMap.prototype.replace = function (values) {
        var _this = this;
        transaction(function () {
            var replacementMap = convertToMap(values);
            var oldKeys = _this._keys;
            var newKeys = Array.from(replacementMap.keys());
            var keysChanged = false;
            for (var i = 0; i < oldKeys.length; i++) {
                var oldKey = oldKeys[i];
                // key order change
                if (oldKeys.length === newKeys.length && oldKey !== newKeys[i]) {
                    keysChanged = true;
                }
                // deleted key
                if (!replacementMap.has(oldKey)) {
                    keysChanged = true;
                    _this.delete(oldKey);
                }
            }
            replacementMap.forEach(function (value, key) {
                // new key
                if (!_this._data.has(key)) {
                    keysChanged = true;
                }
                _this.set(key, value);
            });
            if (keysChanged) {
                _this._keys.replace(newKeys);
            }
        });
        return this;
    };
    Object.defineProperty(ObservableMap.prototype, "size", {
        get: function () {
            return this._keys.length;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Returns a plain object that represents this map.
     * Note that all the keys being stringified.
     * If there are duplicating keys after converting them to strings, behaviour is undetermined.
     */
    ObservableMap.prototype.toPOJO = function () {
        var _this = this;
        var res = {};
        this._keys.forEach(function (key) { return (res[typeof key === "symbol" ? key : stringifyKey(key)] = _this.get(key)); });
        return res;
    };
    /**
     * Returns a shallow non observable object clone of this map.
     * Note that the values migth still be observable. For a deep clone use mobx.toJS.
     */
    ObservableMap.prototype.toJS = function () {
        var _this = this;
        var res = new Map();
        this._keys.forEach(function (key) { return res.set(key, _this.get(key)); });
        return res;
    };
    ObservableMap.prototype.toJSON = function () {
        // Used by JSON.stringify
        return this.toPOJO();
    };
    ObservableMap.prototype.toString = function () {
        var _this = this;
        return (this.name +
            "[{ " +
            this._keys.map(function (key) { return stringifyKey(key) + ": " + ("" + _this.get(key)); }).join(", ") +
            " }]");
    };
    /**
     * Observes this object. Triggers for the events 'add', 'update' and 'delete'.
     * See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe
     * for callback details
     */
    ObservableMap.prototype.observe = function (listener, fireImmediately) {
        invariant(fireImmediately !== true, "`observe` doesn't support fireImmediately=true in combination with maps.");
        return registerListener(this, listener);
    };
    ObservableMap.prototype.intercept = function (handler) {
        return registerInterceptor(this, handler);
    };
    return ObservableMap;
}());
function stringifyKey(key) {
    if (key && key.toString)
        return key.toString();
    else
        return new String(key).toString();
}
declareIterator(ObservableMap.prototype, function () {
    return this.entries();
});
addHiddenFinalProp(ObservableMap.prototype, toStringTagSymbol(), "Map");
/* 'var' fixes small-build issue */
var isObservableMap = createInstanceofPredicate("ObservableMap", ObservableMap);

var ObservableSetMarker = {};
var ObservableSet = /** @class */ (function () {
    function ObservableSet(initialData, enhancer, name) {
        if (enhancer === void 0) { enhancer = deepEnhancer; }
        if (name === void 0) { name = "ObservableSet@" + getNextId(); }
        this.name = name;
        this.$mobx = ObservableSetMarker;
        this._data = new Set();
        this._atom = createAtom(this.name);
        if (typeof Set !== "function") {
            throw new Error("mobx.set requires Set polyfill for the current browser. Check babel-polyfill or core-js/es6/set.js");
        }
        this.enhancer = function (newV, oldV) { return enhancer(newV, oldV, name); };
        if (initialData) {
            this.replace(initialData);
        }
    }
    ObservableSet.prototype.dehanceValue = function (value) {
        if (this.dehancer !== undefined) {
            return this.dehancer(value);
        }
        return value;
    };
    ObservableSet.prototype.clear = function () {
        var _this = this;
        transaction(function () {
            untracked(function () {
                _this._data.forEach(function (value) {
                    _this.delete(value);
                });
            });
        });
    };
    ObservableSet.prototype.forEach = function (callbackFn, thisArg) {
        var _this = this;
        this._data.forEach(function (value) {
            callbackFn.call(thisArg, value, value, _this);
        });
    };
    Object.defineProperty(ObservableSet.prototype, "size", {
        get: function () {
            this._atom.reportObserved();
            return this._data.size;
        },
        enumerable: true,
        configurable: true
    });
    ObservableSet.prototype.add = function (value) {
        var _this = this;
        checkIfStateModificationsAreAllowed(this._atom);
        if (hasInterceptors(this)) {
            var change = interceptChange(this, {
                type: "add",
                object: this,
                newValue: value
            });
            if (!change)
                return this;
            // TODO: ideally, value = change.value would be done here, so that values can be
            // changed by interceptor. Same applies for other Set and Map api's.
        }
        if (!this.has(value)) {
            transaction(function () {
                _this._data.add(_this.enhancer(value, undefined));
                _this._atom.reportChanged();
            });
            var notifySpy = isSpyEnabled();
            var notify = hasListeners(this);
            var change = notify || notifySpy
                ? {
                    type: "add",
                    object: this,
                    newValue: value
                }
                : null;
            if (notifySpy && "development" !== "production")
                spyReportStart(change);
            if (notify)
                notifyListeners(this, change);
            if (notifySpy && "development" !== "production")
                spyReportEnd();
        }
        return this;
    };
    ObservableSet.prototype.delete = function (value) {
        var _this = this;
        if (hasInterceptors(this)) {
            var change = interceptChange(this, {
                type: "delete",
                object: this,
                oldValue: value
            });
            if (!change)
                return false;
        }
        if (this.has(value)) {
            var notifySpy = isSpyEnabled();
            var notify = hasListeners(this);
            var change = notify || notifySpy
                ? {
                    type: "delete",
                    object: this,
                    oldValue: value
                }
                : null;
            if (notifySpy && "development" !== "production")
                spyReportStart(__assign(__assign({}, change), { name: this.name }));
            transaction(function () {
                _this._atom.reportChanged();
                _this._data.delete(value);
            });
            if (notify)
                notifyListeners(this, change);
            if (notifySpy && "development" !== "production")
                spyReportEnd();
            return true;
        }
        return false;
    };
    ObservableSet.prototype.has = function (value) {
        this._atom.reportObserved();
        return this._data.has(this.dehanceValue(value));
    };
    ObservableSet.prototype.entries = function () {
        var nextIndex = 0;
        var keys = iteratorToArray(this.keys());
        var values = iteratorToArray(this.values());
        return makeIterable({
            next: function () {
                var index = nextIndex;
                nextIndex += 1;
                return index < values.length
                    ? { value: [keys[index], values[index]], done: false }
                    : { done: true };
            }
        });
    };
    ObservableSet.prototype.keys = function () {
        return this.values();
    };
    ObservableSet.prototype.values = function () {
        this._atom.reportObserved();
        var self = this;
        var nextIndex = 0;
        var observableValues;
        if (this._data.values !== undefined) {
            observableValues = iteratorToArray(this._data.values());
        }
        else {
            // There is no values function in IE11
            observableValues = [];
            this._data.forEach(function (e) { return observableValues.push(e); });
        }
        return makeIterable({
            next: function () {
                return nextIndex < observableValues.length
                    ? { value: self.dehanceValue(observableValues[nextIndex++]), done: false }
                    : { done: true };
            }
        });
    };
    ObservableSet.prototype.replace = function (other) {
        var _this = this;
        if (isObservableSet(other)) {
            other = other.toJS();
        }
        transaction(function () {
            if (Array.isArray(other)) {
                _this.clear();
                other.forEach(function (value) { return _this.add(value); });
            }
            else if (isES6Set(other)) {
                _this.clear();
                other.forEach(function (value) { return _this.add(value); });
            }
            else if (other !== null && other !== undefined) {
                fail("Cannot initialize set from " + other);
            }
        });
        return this;
    };
    ObservableSet.prototype.observe = function (listener, fireImmediately) {
        // TODO 'fireImmediately' can be true?
        invariant(fireImmediately !== true, "`observe` doesn't support fireImmediately=true in combination with sets.");
        return registerListener(this, listener);
    };
    ObservableSet.prototype.intercept = function (handler) {
        return registerInterceptor(this, handler);
    };
    ObservableSet.prototype.toJS = function () {
        return new Set(this);
    };
    ObservableSet.prototype.toString = function () {
        return this.name + "[ " + iteratorToArray(this.keys()).join(", ") + " ]";
    };
    return ObservableSet;
}());
declareIterator(ObservableSet.prototype, function () {
    return this.values();
});
addHiddenFinalProp(ObservableSet.prototype, toStringTagSymbol(), "Set");
var isObservableSet = createInstanceofPredicate("ObservableSet", ObservableSet);

var ObservableObjectAdministration = /** @class */ (function () {
    function ObservableObjectAdministration(target, name, defaultEnhancer) {
        this.target = target;
        this.name = name;
        this.defaultEnhancer = defaultEnhancer;
        this.values = {};
    }
    ObservableObjectAdministration.prototype.read = function (owner, key) {
        return this.values[key].get();
    };
    ObservableObjectAdministration.prototype.write = function (owner, key, newValue) {
        var instance = this.target;
        var observable = this.values[key];
        if (observable instanceof ComputedValue) {
            observable.set(newValue);
            return;
        }
        // intercept
        if (hasInterceptors(this)) {
            var change = interceptChange(this, {
                type: "update",
                object: instance,
                name: key,
                newValue: newValue
            });
            if (!change)
                return;
            newValue = change.newValue;
        }
        newValue = observable.prepareNewValue(newValue);
        // notify spy & observers
        if (newValue !== globalState.UNCHANGED) {
            var notify = hasListeners(this);
            var notifySpy = isSpyEnabled();
            var change = notify || notifySpy
                ? {
                    type: "update",
                    object: instance,
                    oldValue: observable.value,
                    name: key,
                    newValue: newValue
                }
                : null;
            if (notifySpy)
                spyReportStart(__assign(__assign({}, change), { name: this.name, key: key }));
            observable.setNewValue(newValue);
            if (notify)
                notifyListeners(this, change);
            if (notifySpy)
                spyReportEnd();
        }
    };
    ObservableObjectAdministration.prototype.remove = function (key) {
        if (!this.values[key])
            return;
        var target = this.target;
        if (hasInterceptors(this)) {
            var change = interceptChange(this, {
                object: target,
                name: key,
                type: "remove"
            });
            if (!change)
                return;
        }
        try {
            startBatch();
            var notify = hasListeners(this);
            var notifySpy = isSpyEnabled();
            var oldValue = this.values[key].get();
            if (this.keys)
                this.keys.remove(key);
            delete this.values[key];
            delete this.target[key];
            var change = notify || notifySpy
                ? {
                    type: "remove",
                    object: target,
                    oldValue: oldValue,
                    name: key
                }
                : null;
            if (notifySpy)
                spyReportStart(__assign(__assign({}, change), { name: this.name, key: key }));
            if (notify)
                notifyListeners(this, change);
            if (notifySpy)
                spyReportEnd();
        }
        finally {
            endBatch();
        }
    };
    ObservableObjectAdministration.prototype.illegalAccess = function (owner, propName) {
        /**
         * This happens if a property is accessed through the prototype chain, but the property was
         * declared directly as own property on the prototype.
         *
         * E.g.:
         * class A {
         * }
         * extendObservable(A.prototype, { x: 1 })
         *
         * classB extens A {
         * }
         * console.log(new B().x)
         *
         * It is unclear whether the property should be considered 'static' or inherited.
         * Either use `console.log(A.x)`
         * or: decorate(A, { x: observable })
         *
         * When using decorate, the property will always be redeclared as own property on the actual instance
         */
        console.warn("Property '" + propName + "' of '" + owner + "' was accessed through the prototype chain. Use 'decorate' instead to declare the prop or access it statically through it's owner");
    };
    /**
     * Observes this object. Triggers for the events 'add', 'update' and 'delete'.
     * See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe
     * for callback details
     */
    ObservableObjectAdministration.prototype.observe = function (callback, fireImmediately) {
        invariant(fireImmediately !== true, "`observe` doesn't support the fire immediately property for observable objects.");
        return registerListener(this, callback);
    };
    ObservableObjectAdministration.prototype.intercept = function (handler) {
        return registerInterceptor(this, handler);
    };
    ObservableObjectAdministration.prototype.getKeys = function () {
        var _this = this;
        if (this.keys === undefined) {
            this.keys = (new ObservableArray(Object.keys(this.values).filter(function (key) { return _this.values[key] instanceof ObservableValue; }), referenceEnhancer, "keys(" + this.name + ")", true));
        }
        return this.keys.slice();
    };
    return ObservableObjectAdministration;
}());
function asObservableObject(target, name, defaultEnhancer) {
    if (name === void 0) { name = ""; }
    if (defaultEnhancer === void 0) { defaultEnhancer = deepEnhancer; }
    var adm = target.$mobx;
    if (adm)
        return adm;
    invariant(Object.isExtensible(target), "Cannot make the designated object observable; it is not extensible");
    if (!isPlainObject(target))
        name = (target.constructor.name || "ObservableObject") + "@" + getNextId();
    if (!name)
        name = "ObservableObject@" + getNextId();
    adm = new ObservableObjectAdministration(target, name, defaultEnhancer);
    addHiddenFinalProp(target, "$mobx", adm);
    return adm;
}
function defineObservableProperty(target, propName, newValue, enhancer) {
    var adm = asObservableObject(target);
    assertPropertyConfigurable(target, propName);
    if (hasInterceptors(adm)) {
        var change = interceptChange(adm, {
            object: target,
            name: propName,
            type: "add",
            newValue: newValue
        });
        if (!change)
            return;
        newValue = change.newValue;
    }
    var observable = (adm.values[propName] = new ObservableValue(newValue, enhancer, adm.name + "." + propName, false));
    newValue = observable.value; // observableValue might have changed it
    Object.defineProperty(target, propName, generateObservablePropConfig(propName));
    if (adm.keys)
        adm.keys.push(propName);
    notifyPropertyAddition(adm, target, propName, newValue);
}
function defineComputedProperty(target, // which objects holds the observable and provides `this` context?
propName, options) {
    var adm = asObservableObject(target);
    options.name = adm.name + "." + propName;
    options.context = target;
    adm.values[propName] = new ComputedValue(options);
    Object.defineProperty(target, propName, generateComputedPropConfig(propName));
}
var observablePropertyConfigs = Object.create(null);
var computedPropertyConfigs = Object.create(null);
function generateObservablePropConfig(propName) {
    return (observablePropertyConfigs[propName] ||
        (observablePropertyConfigs[propName] = {
            configurable: true,
            enumerable: true,
            get: function () {
                return this.$mobx.read(this, propName);
            },
            set: function (v) {
                this.$mobx.write(this, propName, v);
            }
        }));
}
function getAdministrationForComputedPropOwner(owner) {
    var adm = owner.$mobx;
    if (!adm) {
        // because computed props are declared on proty,
        // the current instance might not have been initialized yet
        initializeInstance(owner);
        return owner.$mobx;
    }
    return adm;
}
function generateComputedPropConfig(propName) {
    return (computedPropertyConfigs[propName] ||
        (computedPropertyConfigs[propName] = {
            configurable: globalState.computedConfigurable,
            enumerable: false,
            get: function () {
                return getAdministrationForComputedPropOwner(this).read(this, propName);
            },
            set: function (v) {
                getAdministrationForComputedPropOwner(this).write(this, propName, v);
            }
        }));
}
function notifyPropertyAddition(adm, object, key, newValue) {
    var notify = hasListeners(adm);
    var notifySpy = isSpyEnabled();
    var change = notify || notifySpy
        ? {
            type: "add",
            object: object,
            name: key,
            newValue: newValue
        }
        : null;
    if (notifySpy)
        spyReportStart(__assign(__assign({}, change), { name: adm.name, key: key }));
    if (notify)
        notifyListeners(adm, change);
    if (notifySpy)
        spyReportEnd();
}
var isObservableObjectAdministration = createInstanceofPredicate("ObservableObjectAdministration", ObservableObjectAdministration);
function isObservableObject(thing) {
    if (isObject(thing)) {
        // Initializers run lazily when transpiling to babel, so make sure they are run...
        initializeInstance(thing);
        return isObservableObjectAdministration(thing.$mobx);
    }
    return false;
}

function getAtom(thing, property) {
    if (typeof thing === "object" && thing !== null) {
        if (isObservableArray(thing)) {
            if (property !== undefined)
                fail("It is not possible to get index atoms from arrays");
            return thing.$mobx.atom;
        }
        if (isObservableSet(thing)) {
            return thing.$mobx;
        }
        if (isObservableMap(thing)) {
            var anyThing = thing;
            if (property === undefined)
                return getAtom(anyThing._keys);
            var observable = anyThing._data.get(property) || anyThing._hasMap.get(property);
            if (!observable)
                fail("the entry '" + property + "' does not exist in the observable map '" + getDebugName(thing) + "'");
            return observable;
        }
        // Initializers run lazily when transpiling to babel, so make sure they are run...
        initializeInstance(thing);
        if (property && !thing.$mobx)
            thing[property]; // See #1072
        if (isObservableObject(thing)) {
            if (!property)
                return fail("please specify a property");
            var observable = thing.$mobx.values[property];
            if (!observable)
                fail("no observable property '" + property + "' found on the observable object '" + getDebugName(thing) + "'");
            return observable;
        }
        if (isAtom(thing) || isComputedValue(thing) || isReaction(thing)) {
            return thing;
        }
    }
    else if (typeof thing === "function") {
        if (isReaction(thing.$mobx)) {
            // disposer function
            return thing.$mobx;
        }
    }
    return fail("Cannot obtain atom from " + thing);
}
function getAdministration(thing, property) {
    if (!thing)
        fail("Expecting some object");
    if (property !== undefined)
        return getAdministration(getAtom(thing, property));
    if (isAtom(thing) || isComputedValue(thing) || isReaction(thing))
        return thing;
    if (isObservableMap(thing) || isObservableSet(thing))
        return thing;
    // Initializers run lazily when transpiling to babel, so make sure they are run...
    initializeInstance(thing);
    if (thing.$mobx)
        return thing.$mobx;
    fail("Cannot obtain administration from " + thing);
}
function getDebugName(thing, property) {
    var named;
    if (property !== undefined)
        named = getAtom(thing, property);
    else if (isObservableObject(thing) || isObservableMap(thing) || isObservableSet(thing))
        named = getAdministration(thing);
    else
        named = getAtom(thing); // valid for arrays as well
    return named.name;
}

var toString = Object.prototype.toString;
function deepEqual(a, b, depth) {
    if (depth === void 0) { depth = -1; }
    return eq(a, b, depth);
}
// Copied from https://github.com/jashkenas/underscore/blob/5c237a7c682fb68fd5378203f0bf22dce1624854/underscore.js#L1186-L1289
// Internal recursive comparison function for `isEqual`.
function eq(a, b, depth, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b)
        return a !== 0 || 1 / a === 1 / b;
    // `null` or `undefined` only equal to itself (strict comparison).
    if (a == null || b == null)
        return false;
    // `NaN`s are equivalent, but non-reflexive.
    if (a !== a)
        return b !== b;
    // Exhaust primitive checks
    var type = typeof a;
    if (type !== "function" && type !== "object" && typeof b != "object")
        return false;
    // Unwrap any wrapped objects.
    a = unwrap(a);
    b = unwrap(b);
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b))
        return false;
    switch (className) {
        // Strings, numbers, regular expressions, dates, and booleans are compared by value.
        case "[object RegExp]":
        // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
        case "[object String]":
            // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
            // equivalent to `new String("5")`.
            return "" + a === "" + b;
        case "[object Number]":
            // `NaN`s are equivalent, but non-reflexive.
            // Object(NaN) is equivalent to NaN.
            if (+a !== +a)
                return +b !== +b;
            // An `egal` comparison is performed for other numeric values.
            return +a === 0 ? 1 / +a === 1 / b : +a === +b;
        case "[object Date]":
        case "[object Boolean]":
            // Coerce dates and booleans to numeric primitive values. Dates are compared by their
            // millisecond representations. Note that invalid dates with millisecond representations
            // of `NaN` are not equivalent.
            return +a === +b;
        case "[object Symbol]":
            return (
            // eslint-disable-next-line
            typeof Symbol !== "undefined" && Symbol.valueOf.call(a) === Symbol.valueOf.call(b));
    }
    var areArrays = className === "[object Array]";
    if (!areArrays) {
        if (typeof a != "object" || typeof b != "object")
            return false;
        // Objects with different constructors are not equivalent, but `Object`s or `Array`s
        // from different frames are.
        var aCtor = a.constructor, bCtor = b.constructor;
        if (aCtor !== bCtor &&
            !(typeof aCtor === "function" &&
                aCtor instanceof aCtor &&
                typeof bCtor === "function" &&
                bCtor instanceof bCtor) &&
            ("constructor" in a && "constructor" in b)) {
            return false;
        }
    }
    if (depth === 0) {
        return false;
    }
    else if (depth < 0) {
        depth = -1;
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    // Initializing stack of traversed objects.
    // It's done here since we only need them for objects and arrays comparison.
    aStack = aStack || [];
    bStack = bStack || [];
    var length = aStack.length;
    while (length--) {
        // Linear search. Performance is inversely proportional to the number of
        // unique nested structures.
        if (aStack[length] === a)
            return bStack[length] === b;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    // Recursively compare objects and arrays.
    if (areArrays) {
        // Compare array lengths to determine if a deep comparison is necessary.
        length = a.length;
        if (length !== b.length)
            return false;
        // Deep compare the contents, ignoring non-numeric properties.
        while (length--) {
            if (!eq(a[length], b[length], depth - 1, aStack, bStack))
                return false;
        }
    }
    else {
        // Deep compare objects.
        var keys = Object.keys(a);
        var key = void 0;
        length = keys.length;
        // Ensure that both objects contain the same number of properties before comparing deep equality.
        if (Object.keys(b).length !== length)
            return false;
        while (length--) {
            // Deep compare each member
            key = keys[length];
            if (!(has$1(b, key) && eq(a[key], b[key], depth - 1, aStack, bStack)))
                return false;
        }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return true;
}
function unwrap(a) {
    if (isObservableArray(a))
        return a.peek();
    if (isES6Map(a) || isObservableMap(a))
        return iteratorToArray(a.entries());
    if (isES6Set(a) || isObservableSet(a))
        return iteratorToArray(a.entries());
    return a;
}
function has$1(a, key) {
    return Object.prototype.hasOwnProperty.call(a, key);
}

/*
The only reason for this file to exist is pure horror:
Without it rollup can make the bundling fail at any point in time; when it rolls up the files in the wrong order
it will cause undefined errors (for example because super classes or local variables not being hosted).
With this file that will still happen,
but at least in this file we can magically reorder the imports with trial and error until the build succeeds again.
*/

/**
 * (c) Michel Weststrate 2015 - 2019
 * MIT Licensed
 *
 * Welcome to the mobx sources! To get an global overview of how MobX internally works,
 * this is a good place to start:
 * https://medium.com/@mweststrate/becoming-fully-reactive-an-in-depth-explanation-of-mobservable-55995262a254#.xvbh6qd74
 *
 * Source folders:
 * ===============
 *
 * - api/     Most of the public static methods exposed by the module can be found here.
 * - core/    Implementation of the MobX algorithm; atoms, derivations, reactions, dependency trees, optimizations. Cool stuff can be found here.
 * - types/   All the magic that is need to have observable objects, arrays and values is in this folder. Including the modifiers like `asFlat`.
 * - utils/   Utility stuff.
 *
 */
try {
}
catch (e) {
    var g = getGlobal();
    if (typeof process === "undefined")
        g.process = {};
    g.process.env = {};
}
(function () {
    function testCodeMinification() { }
    if (testCodeMinification.name !== "testCodeMinification" &&
        "development" !== "production" &&
        typeof process !== 'undefined' && process.env.IGNORE_MOBX_MINIFY_WARNING !== "true") {
        // trick so it doesn't get replaced
        var varName = ["process", "env", "NODE_ENV"].join(".");
        console.warn("[mobx] you are running a minified build, but '" + varName + "' was not set to 'production' in your bundler. This results in an unnecessarily large and slow bundle");
    }
})();
// forward compatibility with mobx, so that packages can easily support mobx 4 & 5
var $mobx = "$mobx";
if (typeof __MOBX_DEVTOOLS_GLOBAL_HOOK__ === "object") {
    // See: https://github.com/andykog/mobx-devtools/
    __MOBX_DEVTOOLS_GLOBAL_HOOK__.injectMobx({
        spy: spy,
        extras: {
            getDebugName: getDebugName
        },
        $mobx: $mobx
    });
}
// TODO: remove in some future build
if (typeof module !== "undefined" &&
    typeof module.exports !== "undefined") {
    var warnedAboutDefaultExport_1 = false;
    Object.defineProperty(module.exports, "default", {
        enumerable: false,
        get: function () {
            if (!warnedAboutDefaultExport_1) {
                warnedAboutDefaultExport_1 = true;
                console.warn("The MobX package does not have a default export. Use 'import { thing } from \"mobx\"' (recommended) or 'import * as mobx from \"mobx\"' instead.\"");
            }
            return undefined;
        }
    });
    [
        "extras",
        "Atom",
        "BaseAtom",
        "asFlat",
        "asMap",
        "asReference",
        "asStructure",
        "autorunAsync",
        "createTranformer",
        "expr",
        "isModifierDescriptor",
        "isStrictModeEnabled",
        "map",
        "useStrict",
        "whyRun"
    ].forEach(function (prop) {
        Object.defineProperty(module.exports, prop, {
            enumerable: false,
            get: function () {
                fail("'" + prop + "' is no longer part of the public MobX api. Please consult the changelog to find out where this functionality went");
            },
            set: function () { }
        });
    });
}

exports.$mobx = $mobx;
exports.FlowCancellationError = FlowCancellationError;
exports.ObservableMap = ObservableMap;
exports.ObservableSet = ObservableSet;
exports.Reaction = Reaction;
exports._allowStateChanges = allowStateChanges;
exports._allowStateChangesInsideComputed = allowStateChangesInsideComputed;
exports._allowStateReadsEnd = allowStateReadsEnd;
exports._allowStateReadsStart = allowStateReadsStart;
exports._endAction = _endAction;
exports._getAdministration = getAdministration;
exports._getGlobalState = getGlobalState;
exports._interceptReads = interceptReads;
exports._isComputingDerivation = isComputingDerivation;
exports._resetGlobalState = resetGlobalState;
exports._startAction = _startAction;
exports.action = action;
exports.autorun = autorun;
exports.comparer = comparer;
exports.computed = computed;
exports.configure = configure;
exports.createAtom = createAtom;
exports.decorate = decorate;
exports.entries = entries;
exports.extendObservable = extendObservable;
exports.extendShallowObservable = extendShallowObservable;
exports.flow = flow;
exports.get = get;
exports.getAtom = getAtom;
exports.getDebugName = getDebugName;
exports.getDependencyTree = getDependencyTree;
exports.getObserverTree = getObserverTree;
exports.has = has;
exports.intercept = intercept;
exports.isAction = isAction;
exports.isArrayLike = isArrayLike;
exports.isBoxedObservable = isObservableValue;
exports.isComputed = isComputed;
exports.isComputedProp = isComputedProp;
exports.isFlowCancellationError = isFlowCancellationError;
exports.isObservable = isObservable;
exports.isObservableArray = isObservableArray;
exports.isObservableMap = isObservableMap;
exports.isObservableObject = isObservableObject;
exports.isObservableProp = isObservableProp;
exports.isObservableSet = isObservableSet;
exports.keys = keys;
exports.observable = observable;
exports.observe = observe;
exports.onBecomeObserved = onBecomeObserved;
exports.onBecomeUnobserved = onBecomeUnobserved;
exports.onReactionError = onReactionError;
exports.reaction = reaction;
exports.remove = remove;
exports.runInAction = runInAction;
exports.set = set;
exports.spy = spy;
exports.toJS = toJS;
exports.trace = trace;
exports.transaction = transaction;
exports.untracked = untracked;
exports.values = values;
exports.when = when;

})
		], [
			/* mobx: 20 */
			"lib/index.js", ["cjs","js"], {"./mobx.js": 19}, (function(GLOBAL, __dirname, __filename, exports, global, module, process, require) {

if (0 /*typeof process !== 'undefined' && process.env.NODE_ENV === 'pr...*/) {/* 
    module.exports = require('./mobx.min.js'); */
} else {
    module.exports = require('./mobx.js');
}
        
})
		]
	]
}, {
	name: "mobx-state-tree",
	version: "3.16.0",
	root: "node_modules/mobx-state-tree",
	main: "dist/mobx-state-tree.js",
	files: [
		[
			/* mobx-state-tree: 21 */
			"dist/mobx-state-tree.js", ["cjs","js"], {"mobx": 20}, (function(GLOBAL, __dirname, __filename, exports, global, module, process, require) {
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var mobx = require('mobx');

var livelinessChecking = "warn";
/**
 * Defines what MST should do when running into reads / writes to objects that have died.
 * By default it will print a warning.
 * Use the `"error"` option to easy debugging to see where the error was thrown and when the offending read / write took place
 *
 * @param mode `"warn"`, `"error"` or `"ignore"`
 */
function setLivelinessChecking(mode) {
    livelinessChecking = mode;
}
/**
 * Returns the current liveliness checking mode.
 *
 * @returns `"warn"`, `"error"` or `"ignore"`
 */
function getLivelinessChecking() {
    return livelinessChecking;
}
/**
 * @deprecated use setLivelinessChecking instead
 * @hidden
 *
 * Defines what MST should do when running into reads / writes to objects that have died.
 * By default it will print a warning.
 * Use the `"error"` option to easy debugging to see where the error was thrown and when the offending read / write took place
 *
 * @param mode `"warn"`, `"error"` or `"ignore"`
 */
function setLivelynessChecking(mode) {
    setLivelinessChecking(mode);
}

/**
 * @hidden
 */
var Hook;
(function (Hook) {
    Hook["afterCreate"] = "afterCreate";
    Hook["afterAttach"] = "afterAttach";
    Hook["afterCreationFinalization"] = "afterCreationFinalization";
    Hook["beforeDetach"] = "beforeDetach";
    Hook["beforeDestroy"] = "beforeDestroy";
})(Hook || (Hook = {}));

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
}

function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

function __values(o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
}

function __read(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
}

function __spread() {
    for (var ar = [], i = 0; i < arguments.length; i++)
        ar = ar.concat(__read(arguments[i]));
    return ar;
}

/**
 * Returns the _actual_ type of the given tree node. (Or throws)
 *
 * @param object
 * @returns
 */
function getType(object) {
    assertIsStateTreeNode(object, 1);
    return getStateTreeNode(object).type;
}
/**
 * Returns the _declared_ type of the given sub property of an object, array or map.
 * In the case of arrays and maps the property name is optional and will be ignored.
 *
 * Example:
 * ```ts
 * const Box = types.model({ x: 0, y: 0 })
 * const box = Box.create()
 *
 * console.log(getChildType(box, "x").name) // 'number'
 * ```
 *
 * @param object
 * @param propertyName
 * @returns
 */
function getChildType(object, propertyName) {
    assertIsStateTreeNode(object, 1);
    return getStateTreeNode(object).getChildType(propertyName);
}
/**
 * Registers a function that will be invoked for each mutation that is applied to the provided model instance, or to any of its children.
 * See [patches](https://github.com/mobxjs/mobx-state-tree#patches) for more details. onPatch events are emitted immediately and will not await the end of a transaction.
 * Patches can be used to deep observe a model tree.
 *
 * @param target the model instance from which to receive patches
 * @param callback the callback that is invoked for each patch. The reversePatch is a patch that would actually undo the emitted patch
 * @returns function to remove the listener
 */
function onPatch(target, callback) {
    // check all arguments
    assertIsStateTreeNode(target, 1);
    assertIsFunction(callback, 2);
    return getStateTreeNode(target).onPatch(callback);
}
/**
 * Registers a function that is invoked whenever a new snapshot for the given model instance is available.
 * The listener will only be fire at the end of the current MobX (trans)action.
 * See [snapshots](https://github.com/mobxjs/mobx-state-tree#snapshots) for more details.
 *
 * @param target
 * @param callback
 * @returns
 */
function onSnapshot(target, callback) {
    // check all arguments
    assertIsStateTreeNode(target, 1);
    assertIsFunction(callback, 2);
    return getStateTreeNode(target).onSnapshot(callback);
}
/**
 * Applies a JSON-patch to the given model instance or bails out if the patch couldn't be applied
 * See [patches](https://github.com/mobxjs/mobx-state-tree#patches) for more details.
 *
 * Can apply a single past, or an array of patches.
 *
 * @param target
 * @param patch
 * @returns
 */
function applyPatch(target, patch) {
    // check all arguments
    assertIsStateTreeNode(target, 1);
    assertArg(patch, function (p) { return typeof p === "object"; }, "object or array", 2);
    getStateTreeNode(target).applyPatches(asArray(patch));
}
/**
 * Small abstraction around `onPatch` and `applyPatch`, attaches a patch listener to a tree and records all the patches.
 * Returns an recorder object with the following signature:
 *
 * Example:
 * ```ts
 * export interface IPatchRecorder {
 *      // the recorded patches
 *      patches: IJsonPatch[]
 *      // the inverse of the recorded patches
 *      inversePatches: IJsonPatch[]
 *      // true if currently recording
 *      recording: boolean
 *      // stop recording patches
 *      stop(): void
 *      // resume recording patches
 *      resume(): void
 *      // apply all the recorded patches on the given target (the original subject if omitted)
 *      replay(target?: IAnyStateTreeNode): void
 *      // reverse apply the recorded patches on the given target  (the original subject if omitted)
 *      // stops the recorder if not already stopped
 *      undo(): void
 * }
 * ```
 *
 * The optional filter function allows to skip recording certain patches.
 *
 * @param subject
 * @param filter
 * @returns
 */
function recordPatches(subject, filter) {
    // check all arguments
    assertIsStateTreeNode(subject, 1);
    var data = {
        patches: [],
        reversedInversePatches: []
    };
    // we will generate the immutable copy of patches on demand for public consumption
    var publicData = {};
    var disposer;
    var recorder = {
        get recording() {
            return !!disposer;
        },
        get patches() {
            if (!publicData.patches) {
                publicData.patches = data.patches.slice();
            }
            return publicData.patches;
        },
        get reversedInversePatches() {
            if (!publicData.reversedInversePatches) {
                publicData.reversedInversePatches = data.reversedInversePatches.slice();
            }
            return publicData.reversedInversePatches;
        },
        get inversePatches() {
            if (!publicData.inversePatches) {
                publicData.inversePatches = data.reversedInversePatches.slice().reverse();
            }
            return publicData.inversePatches;
        },
        stop: function () {
            if (disposer) {
                disposer();
                disposer = undefined;
            }
        },
        resume: function () {
            if (disposer)
                return;
            disposer = onPatch(subject, function (patch, inversePatch) {
                // skip patches that are asked to be filtered if there's a filter in place
                if (filter && !filter(patch, inversePatch, getRunningActionContext())) {
                    return;
                }
                data.patches.push(patch);
                data.reversedInversePatches.unshift(inversePatch);
                // mark immutable public patches as dirty
                publicData.patches = undefined;
                publicData.inversePatches = undefined;
                publicData.reversedInversePatches = undefined;
            });
        },
        replay: function (target) {
            applyPatch(target || subject, data.patches);
        },
        undo: function (target) {
            applyPatch(target || subject, data.reversedInversePatches);
        }
    };
    recorder.resume();
    return recorder;
}
/**
 * The inverse of `unprotect`.
 *
 * @param target
 */
function protect(target) {
    // check all arguments
    assertIsStateTreeNode(target, 1);
    var node = getStateTreeNode(target);
    if (!node.isRoot)
        throw fail$1("`protect` can only be invoked on root nodes");
    node.isProtectionEnabled = true;
}
/**
 * By default it is not allowed to directly modify a model. Models can only be modified through actions.
 * However, in some cases you don't care about the advantages (like replayability, traceability, etc) this yields.
 * For example because you are building a PoC or don't have any middleware attached to your tree.
 *
 * In that case you can disable this protection by calling `unprotect` on the root of your tree.
 *
 * Example:
 * ```ts
 * const Todo = types.model({
 *     done: false
 * }).actions(self => ({
 *     toggle() {
 *         self.done = !self.done
 *     }
 * }))
 *
 * const todo = Todo.create()
 * todo.done = true // throws!
 * todo.toggle() // OK
 * unprotect(todo)
 * todo.done = false // OK
 * ```
 */
function unprotect(target) {
    // check all arguments
    assertIsStateTreeNode(target, 1);
    var node = getStateTreeNode(target);
    if (!node.isRoot)
        throw fail$1("`unprotect` can only be invoked on root nodes");
    node.isProtectionEnabled = false;
}
/**
 * Returns true if the object is in protected mode, @see protect
 */
function isProtected(target) {
    return getStateTreeNode(target).isProtected;
}
/**
 * Applies a snapshot to a given model instances. Patch and snapshot listeners will be invoked as usual.
 *
 * @param target
 * @param snapshot
 * @returns
 */
function applySnapshot(target, snapshot) {
    // check all arguments
    assertIsStateTreeNode(target, 1);
    return getStateTreeNode(target).applySnapshot(snapshot);
}
/**
 * Calculates a snapshot from the given model instance. The snapshot will always reflect the latest state but use
 * structural sharing where possible. Doesn't require MobX transactions to be completed.
 *
 * @param target
 * @param applyPostProcess If true (the default) then postProcessSnapshot gets applied.
 * @returns
 */
function getSnapshot(target, applyPostProcess) {
    if (applyPostProcess === void 0) { applyPostProcess = true; }
    // check all arguments
    assertIsStateTreeNode(target, 1);
    var node = getStateTreeNode(target);
    if (applyPostProcess)
        return node.snapshot;
    return freeze(node.type.getSnapshot(node, false));
}
/**
 * Given a model instance, returns `true` if the object has a parent, that is, is part of another object, map or array.
 *
 * @param target
 * @param depth How far should we look upward? 1 by default.
 * @returns
 */
function hasParent(target, depth) {
    if (depth === void 0) { depth = 1; }
    // check all arguments
    assertIsStateTreeNode(target, 1);
    assertIsNumber(depth, 2, 0);
    var parent = getStateTreeNode(target).parent;
    while (parent) {
        if (--depth === 0)
            return true;
        parent = parent.parent;
    }
    return false;
}
/**
 * Returns the immediate parent of this object, or throws.
 *
 * Note that the immediate parent can be either an object, map or array, and
 * doesn't necessarily refer to the parent model.
 *
 * Please note that in child nodes access to the root is only possible
 * once the `afterAttach` hook has fired.
 *
 * @param target
 * @param depth How far should we look upward? 1 by default.
 * @returns
 */
function getParent(target, depth) {
    if (depth === void 0) { depth = 1; }
    // check all arguments
    assertIsStateTreeNode(target, 1);
    assertIsNumber(depth, 2, 0);
    var d = depth;
    var parent = getStateTreeNode(target).parent;
    while (parent) {
        if (--d === 0)
            return parent.storedValue;
        parent = parent.parent;
    }
    throw fail$1("Failed to find the parent of " + getStateTreeNode(target) + " at depth " + depth);
}
/**
 * Given a model instance, returns `true` if the object has a parent of given type, that is, is part of another object, map or array
 *
 * @param target
 * @param type
 * @returns
 */
function hasParentOfType(target, type) {
    // check all arguments
    assertIsStateTreeNode(target, 1);
    assertIsType(type, 2);
    var parent = getStateTreeNode(target).parent;
    while (parent) {
        if (type.is(parent.storedValue))
            return true;
        parent = parent.parent;
    }
    return false;
}
/**
 * Returns the target's parent of a given type, or throws.
 *
 * @param target
 * @param type
 * @returns
 */
function getParentOfType(target, type) {
    // check all arguments
    assertIsStateTreeNode(target, 1);
    assertIsType(type, 2);
    var parent = getStateTreeNode(target).parent;
    while (parent) {
        if (type.is(parent.storedValue))
            return parent.storedValue;
        parent = parent.parent;
    }
    throw fail$1("Failed to find the parent of " + getStateTreeNode(target) + " of a given type");
}
/**
 * Given an object in a model tree, returns the root object of that tree.
 *
 * Please note that in child nodes access to the root is only possible
 * once the `afterAttach` hook has fired.
 *
 * @param target
 * @returns
 */
function getRoot(target) {
    // check all arguments
    assertIsStateTreeNode(target, 1);
    return getStateTreeNode(target).root.storedValue;
}
/**
 * Returns the path of the given object in the model tree
 *
 * @param target
 * @returns
 */
function getPath(target) {
    // check all arguments
    assertIsStateTreeNode(target, 1);
    return getStateTreeNode(target).path;
}
/**
 * Returns the path of the given object as unescaped string array.
 *
 * @param target
 * @returns
 */
function getPathParts(target) {
    // check all arguments
    assertIsStateTreeNode(target, 1);
    return splitJsonPath(getStateTreeNode(target).path);
}
/**
 * Returns true if the given object is the root of a model tree.
 *
 * @param target
 * @returns
 */
function isRoot(target) {
    // check all arguments
    assertIsStateTreeNode(target, 1);
    return getStateTreeNode(target).isRoot;
}
/**
 * Resolves a path relatively to a given object.
 * Returns undefined if no value can be found.
 *
 * @param target
 * @param path escaped json path
 * @returns
 */
function resolvePath(target, path) {
    // check all arguments
    assertIsStateTreeNode(target, 1);
    assertIsString(path, 2);
    var node = resolveNodeByPath(getStateTreeNode(target), path);
    return node ? node.value : undefined;
}
/**
 * Resolves a model instance given a root target, the type and the identifier you are searching for.
 * Returns undefined if no value can be found.
 *
 * @param type
 * @param target
 * @param identifier
 * @returns
 */
function resolveIdentifier(type, target, identifier) {
    // check all arguments
    assertIsType(type, 1);
    assertIsStateTreeNode(target, 2);
    assertIsValidIdentifier(identifier, 3);
    var node = getStateTreeNode(target).root.identifierCache.resolve(type, normalizeIdentifier(identifier));
    return node ? node.value : undefined;
}
/**
 * Returns the identifier of the target node.
 * This is the *string normalized* identifier, which might not match the type of the identifier attribute
 *
 * @param target
 * @returns
 */
function getIdentifier(target) {
    // check all arguments
    assertIsStateTreeNode(target, 1);
    return getStateTreeNode(target).identifier;
}
/**
 * Tests if a reference is valid (pointing to an existing node and optionally if alive) and returns such reference if it the check passes,
 * else it returns undefined.
 *
 * @param getter Function to access the reference.
 * @param checkIfAlive true to also make sure the referenced node is alive (default), false to skip this check.
 * @returns
 */
function tryReference(getter, checkIfAlive) {
    if (checkIfAlive === void 0) { checkIfAlive = true; }
    try {
        var node = getter();
        if (node === undefined || node === null) {
            return undefined;
        }
        else if (isStateTreeNode(node)) {
            if (!checkIfAlive) {
                return node;
            }
            else {
                return isAlive(node) ? node : undefined;
            }
        }
        else {
            throw fail$1("The reference to be checked is not one of node, null or undefined");
        }
    }
    catch (e) {
        if (e instanceof InvalidReferenceError) {
            return undefined;
        }
        throw e;
    }
}
/**
 * Tests if a reference is valid (pointing to an existing node and optionally if alive) and returns if the check passes or not.
 *
 * @param getter Function to access the reference.
 * @param checkIfAlive true to also make sure the referenced node is alive (default), false to skip this check.
 * @returns
 */
function isValidReference(getter, checkIfAlive) {
    if (checkIfAlive === void 0) { checkIfAlive = true; }
    try {
        var node = getter();
        if (node === undefined || node === null) {
            return false;
        }
        else if (isStateTreeNode(node)) {
            return checkIfAlive ? isAlive(node) : true;
        }
        else {
            throw fail$1("The reference to be checked is not one of node, null or undefined");
        }
    }
    catch (e) {
        if (e instanceof InvalidReferenceError) {
            return false;
        }
        throw e;
    }
}
/**
 * Try to resolve a given path relative to a given node.
 *
 * @param target
 * @param path
 * @returns
 */
function tryResolve(target, path) {
    // check all arguments
    assertIsStateTreeNode(target, 1);
    assertIsString(path, 2);
    var node = resolveNodeByPath(getStateTreeNode(target), path, false);
    if (node === undefined)
        return undefined;
    try {
        return node.value;
    }
    catch (e) {
        // For what ever reason not resolvable (e.g. totally not existing path, or value that cannot be fetched)
        // see test / issue: 'try resolve doesn't work #686'
        return undefined;
    }
}
/**
 * Given two state tree nodes that are part of the same tree,
 * returns the shortest jsonpath needed to navigate from the one to the other
 *
 * @param base
 * @param target
 * @returns
 */
function getRelativePath(base, target) {
    // check all arguments
    assertIsStateTreeNode(base, 1);
    assertIsStateTreeNode(target, 2);
    return getRelativePathBetweenNodes(getStateTreeNode(base), getStateTreeNode(target));
}
/**
 * Returns a deep copy of the given state tree node as new tree.
 * Short hand for `snapshot(x) = getType(x).create(getSnapshot(x))`
 *
 * _Tip: clone will create a literal copy, including the same identifiers. To modify identifiers etc during cloning, don't use clone but take a snapshot of the tree, modify it, and create new instance_
 *
 * @param source
 * @param keepEnvironment indicates whether the clone should inherit the same environment (`true`, the default), or not have an environment (`false`). If an object is passed in as second argument, that will act as the environment for the cloned tree.
 * @returns
 */
function clone(source, keepEnvironment) {
    if (keepEnvironment === void 0) { keepEnvironment = true; }
    // check all arguments
    assertIsStateTreeNode(source, 1);
    var node = getStateTreeNode(source);
    return node.type.create(node.snapshot, keepEnvironment === true
        ? node.root.environment
        : keepEnvironment === false
            ? undefined
            : keepEnvironment); // it's an object or something else
}
/**
 * Removes a model element from the state tree, and let it live on as a new state tree
 */
function detach(target) {
    // check all arguments
    assertIsStateTreeNode(target, 1);
    getStateTreeNode(target).detach();
    return target;
}
/**
 * Removes a model element from the state tree, and mark it as end-of-life; the element should not be used anymore
 */
function destroy(target) {
    // check all arguments
    assertIsStateTreeNode(target, 1);
    var node = getStateTreeNode(target);
    if (node.isRoot)
        node.die();
    else
        node.parent.removeChild(node.subpath);
}
/**
 * Returns true if the given state tree node is not killed yet.
 * This means that the node is still a part of a tree, and that `destroy`
 * has not been called. If a node is not alive anymore, the only thing one can do with it
 * is requesting it's last path and snapshot
 *
 * @param target
 * @returns
 */
function isAlive(target) {
    // check all arguments
    assertIsStateTreeNode(target, 1);
    return getStateTreeNode(target).observableIsAlive;
}
/**
 * Use this utility to register a function that should be called whenever the
 * targeted state tree node is destroyed. This is a useful alternative to managing
 * cleanup methods yourself using the `beforeDestroy` hook.
 *
 * This methods returns the same disposer that was passed as argument.
 *
 * Example:
 * ```ts
 * const Todo = types.model({
 *   title: types.string
 * }).actions(self => ({
 *   afterCreate() {
 *     const autoSaveDisposer = reaction(
 *       () => getSnapshot(self),
 *       snapshot => sendSnapshotToServerSomehow(snapshot)
 *     )
 *     // stop sending updates to server if this
 *     // instance is destroyed
 *     addDisposer(self, autoSaveDisposer)
 *   }
 * }))
 * ```
 *
 * @param target
 * @param disposer
 * @returns The same disposer that was passed as argument
 */
function addDisposer(target, disposer) {
    // check all arguments
    assertIsStateTreeNode(target, 1);
    assertIsFunction(disposer, 2);
    var node = getStateTreeNode(target);
    node.addDisposer(disposer);
    return disposer;
}
/**
 * Returns the environment of the current state tree. For more info on environments,
 * see [Dependency injection](https://github.com/mobxjs/mobx-state-tree#dependency-injection)
 *
 * Please note that in child nodes access to the root is only possible
 * once the `afterAttach` hook has fired
 *
 * Returns an empty environment if the tree wasn't initialized with an environment
 *
 * @param target
 * @returns
 */
function getEnv(target) {
    // check all arguments
    assertIsStateTreeNode(target, 1);
    var node = getStateTreeNode(target);
    var env = node.root.environment;
    if (!env)
        return EMPTY_OBJECT;
    return env;
}
/**
 * Performs a depth first walk through a tree.
 */
function walk(target, processor) {
    // check all arguments
    assertIsStateTreeNode(target, 1);
    assertIsFunction(processor, 2);
    var node = getStateTreeNode(target);
    // tslint:disable-next-line:no_unused-variable
    node.getChildren().forEach(function (child) {
        if (isStateTreeNode(child.storedValue))
            walk(child.storedValue, processor);
    });
    processor(node.storedValue);
}
/**
 * Returns a reflection of the model type properties and name for either a model type or model node.
 *
 * @param typeOrNode
 * @returns
 */
function getPropertyMembers(typeOrNode) {
    var type;
    if (isStateTreeNode(typeOrNode)) {
        type = getType(typeOrNode);
    }
    else {
        type = typeOrNode;
    }
    assertArg(type, function (t) { return isModelType(t); }, "model type or model instance", 1);
    return {
        name: type.name,
        properties: __assign({}, type.properties)
    };
}
/**
 * Returns a reflection of the model node, including name, properties, views, volatile and actions.
 *
 * @param target
 * @returns
 */
function getMembers(target) {
    var type = getStateTreeNode(target).type;
    var reflected = __assign(__assign({}, getPropertyMembers(type)), { actions: [], volatile: [], views: [] });
    var props = Object.getOwnPropertyNames(target);
    props.forEach(function (key) {
        if (key in reflected.properties)
            return;
        var descriptor = Object.getOwnPropertyDescriptor(target, key);
        if (descriptor.get) {
            if (mobx.isComputedProp(target, key))
                reflected.views.push(key);
            else
                reflected.volatile.push(key);
            return;
        }
        if (descriptor.value._isMSTAction === true)
            reflected.actions.push(key);
        else if (mobx.isObservableProp(target, key))
            reflected.volatile.push(key);
        else
            reflected.views.push(key);
    });
    return reflected;
}
/**
 * Casts a node snapshot or instance type to an instance type so it can be assigned to a type instance.
 * Note that this is just a cast for the type system, this is, it won't actually convert a snapshot to an instance,
 * but just fool typescript into thinking so.
 * Either way, casting when outside an assignation operation won't compile.
 *
 * Example:
 * ```ts
 * const ModelA = types.model({
 *   n: types.number
 * }).actions(self => ({
 *   setN(aNumber: number) {
 *     self.n = aNumber
 *   }
 * }))
 *
 * const ModelB = types.model({
 *   innerModel: ModelA
 * }).actions(self => ({
 *   someAction() {
 *     // this will allow the compiler to assign a snapshot to the property
 *     self.innerModel = cast({ a: 5 })
 *   }
 * }))
 * ```
 *
 * @param snapshotOrInstance Snapshot or instance
 * @returns The same object casted as an instance
 */
function cast(snapshotOrInstance) {
    return snapshotOrInstance;
}
/**
 * Casts a node instance type to an snapshot type so it can be assigned to a type snapshot (e.g. to be used inside a create call).
 * Note that this is just a cast for the type system, this is, it won't actually convert an instance to a snapshot,
 * but just fool typescript into thinking so.
 *
 * Example:
 * ```ts
 * const ModelA = types.model({
 *   n: types.number
 * }).actions(self => ({
 *   setN(aNumber: number) {
 *     self.n = aNumber
 *   }
 * }))
 *
 * const ModelB = types.model({
 *   innerModel: ModelA
 * })
 *
 * const a = ModelA.create({ n: 5 });
 * // this will allow the compiler to use a model as if it were a snapshot
 * const b = ModelB.create({ innerModel: castToSnapshot(a)})
 * ```
 *
 * @param snapshotOrInstance Snapshot or instance
 * @returns The same object casted as an input (creation) snapshot
 */
function castToSnapshot(snapshotOrInstance) {
    return snapshotOrInstance;
}
/**
 * Casts a node instance type to a reference snapshot type so it can be assigned to a refernence snapshot (e.g. to be used inside a create call).
 * Note that this is just a cast for the type system, this is, it won't actually convert an instance to a refererence snapshot,
 * but just fool typescript into thinking so.
 *
 * Example:
 * ```ts
 * const ModelA = types.model({
 *   id: types.identifier,
 *   n: types.number
 * }).actions(self => ({
 *   setN(aNumber: number) {
 *     self.n = aNumber
 *   }
 * }))
 *
 * const ModelB = types.model({
 *   refA: types.reference(ModelA)
 * })
 *
 * const a = ModelA.create({ id: 'someId', n: 5 });
 * // this will allow the compiler to use a model as if it were a reference snapshot
 * const b = ModelB.create({ refA: castToReference(a)})
 * ```
 *
 * @param instance Instance
 * @returns The same object casted as an reference snapshot (string or number)
 */
function castToReferenceSnapshot(instance) {
    return instance;
}
/**
 * Returns the unique node id (not to be confused with the instance identifier) for a
 * given instance.
 * This id is a number that is unique for each instance.
 *
 * @export
 * @param target
 * @returns
 */
function getNodeId(target) {
    assertIsStateTreeNode(target, 1);
    return getStateTreeNode(target).nodeId;
}

/**
 * @internal
 * @hidden
 */
var BaseNode = /** @class */ (function () {
    function BaseNode(type, parent, subpath, environment) {
        this.type = type;
        this.environment = environment;
        this._state = NodeLifeCycle.INITIALIZING;
        this.environment = environment;
        this.baseSetParent(parent, subpath);
    }
    Object.defineProperty(BaseNode.prototype, "subpath", {
        get: function () {
            return this._subpath;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BaseNode.prototype, "subpathUponDeath", {
        get: function () {
            return this._subpathUponDeath;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BaseNode.prototype, "pathUponDeath", {
        get: function () {
            return this._pathUponDeath;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BaseNode.prototype, "value", {
        get: function () {
            return this.type.getValue(this);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BaseNode.prototype, "state", {
        get: function () {
            return this._state;
        },
        set: function (val) {
            var wasAlive = this.isAlive;
            this._state = val;
            var isAlive = this.isAlive;
            if (this.aliveAtom && wasAlive !== isAlive) {
                this.aliveAtom.reportChanged();
            }
        },
        enumerable: true,
        configurable: true
    });
    BaseNode.prototype.fireInternalHook = function (name) {
        if (this._hookSubscribers) {
            this._hookSubscribers.emit(name, this, name);
        }
    };
    BaseNode.prototype.registerHook = function (hook, hookHandler) {
        if (!this._hookSubscribers) {
            this._hookSubscribers = new EventHandlers();
        }
        return this._hookSubscribers.register(hook, hookHandler);
    };
    Object.defineProperty(BaseNode.prototype, "parent", {
        get: function () {
            return this._parent;
        },
        enumerable: true,
        configurable: true
    });
    BaseNode.prototype.baseSetParent = function (parent, subpath) {
        this._parent = parent;
        this._subpath = subpath;
        this._escapedSubpath = undefined; // regenerate when needed
        if (this.pathAtom) {
            this.pathAtom.reportChanged();
        }
    };
    Object.defineProperty(BaseNode.prototype, "path", {
        /*
         * Returns (escaped) path representation as string
         */
        get: function () {
            return this.getEscapedPath(true);
        },
        enumerable: true,
        configurable: true
    });
    BaseNode.prototype.getEscapedPath = function (reportObserved) {
        if (reportObserved) {
            if (!this.pathAtom) {
                this.pathAtom = mobx.createAtom("path");
            }
            this.pathAtom.reportObserved();
        }
        if (!this.parent)
            return "";
        // regenerate escaped subpath if needed
        if (this._escapedSubpath === undefined) {
            this._escapedSubpath = !this._subpath ? "" : escapeJsonPath(this._subpath);
        }
        return this.parent.getEscapedPath(reportObserved) + "/" + this._escapedSubpath;
    };
    Object.defineProperty(BaseNode.prototype, "isRoot", {
        get: function () {
            return this.parent === null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BaseNode.prototype, "isAlive", {
        get: function () {
            return this.state !== NodeLifeCycle.DEAD;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BaseNode.prototype, "isDetaching", {
        get: function () {
            return this.state === NodeLifeCycle.DETACHING;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BaseNode.prototype, "observableIsAlive", {
        get: function () {
            if (!this.aliveAtom) {
                this.aliveAtom = mobx.createAtom("alive");
            }
            this.aliveAtom.reportObserved();
            return this.isAlive;
        },
        enumerable: true,
        configurable: true
    });
    BaseNode.prototype.baseFinalizeCreation = function (whenFinalized) {
        if (devMode()) {
            if (!this.isAlive) {
                // istanbul ignore next
                throw fail("assertion failed: cannot finalize the creation of a node that is already dead");
            }
        }
        // goal: afterCreate hooks runs depth-first. After attach runs parent first, so on afterAttach the parent has completed already
        if (this.state === NodeLifeCycle.CREATED) {
            if (this.parent) {
                if (this.parent.state !== NodeLifeCycle.FINALIZED) {
                    // parent not ready yet, postpone
                    return;
                }
                this.fireHook(Hook.afterAttach);
            }
            this.state = NodeLifeCycle.FINALIZED;
            if (whenFinalized) {
                whenFinalized();
            }
        }
    };
    BaseNode.prototype.baseFinalizeDeath = function () {
        if (this._hookSubscribers) {
            this._hookSubscribers.clearAll();
        }
        this._subpathUponDeath = this._subpath;
        this._pathUponDeath = this.getEscapedPath(false);
        this.baseSetParent(null, "");
        this.state = NodeLifeCycle.DEAD;
    };
    BaseNode.prototype.baseAboutToDie = function () {
        this.fireHook(Hook.beforeDestroy);
    };
    return BaseNode;
}());

/**
 * @internal
 * @hidden
 */
var ScalarNode = /** @class */ (function (_super) {
    __extends(ScalarNode, _super);
    function ScalarNode(simpleType, parent, subpath, environment, initialSnapshot) {
        var _this = _super.call(this, simpleType, parent, subpath, environment) || this;
        try {
            _this.storedValue = simpleType.createNewInstance(initialSnapshot);
        }
        catch (e) {
            // short-cut to die the instance, to avoid the snapshot computed starting to throw...
            _this.state = NodeLifeCycle.DEAD;
            throw e;
        }
        _this.state = NodeLifeCycle.CREATED;
        // for scalar nodes there's no point in firing this event since it would fire on the constructor, before
        // anybody can actually register for/listen to it
        // this.fireHook(Hook.AfterCreate)
        _this.finalizeCreation();
        return _this;
    }
    Object.defineProperty(ScalarNode.prototype, "root", {
        get: function () {
            // future optimization: store root ref in the node and maintain it
            if (!this.parent)
                throw fail$1("This scalar node is not part of a tree");
            return this.parent.root;
        },
        enumerable: true,
        configurable: true
    });
    ScalarNode.prototype.setParent = function (newParent, subpath) {
        var parentChanged = this.parent !== newParent;
        var subpathChanged = this.subpath !== subpath;
        if (!parentChanged && !subpathChanged) {
            return;
        }
        if (devMode()) {
            if (!subpath) {
                // istanbul ignore next
                throw fail$1("assertion failed: subpath expected");
            }
            if (!newParent) {
                // istanbul ignore next
                throw fail$1("assertion failed: parent expected");
            }
            if (parentChanged) {
                // istanbul ignore next
                throw fail$1("assertion failed: scalar nodes cannot change their parent");
            }
        }
        this.environment = undefined; // use parent's
        this.baseSetParent(this.parent, subpath);
    };
    Object.defineProperty(ScalarNode.prototype, "snapshot", {
        get: function () {
            return freeze(this.getSnapshot());
        },
        enumerable: true,
        configurable: true
    });
    ScalarNode.prototype.getSnapshot = function () {
        return this.type.getSnapshot(this);
    };
    ScalarNode.prototype.toString = function () {
        var path = (this.isAlive ? this.path : this.pathUponDeath) || "<root>";
        return this.type.name + "@" + path + (this.isAlive ? "" : " [dead]");
    };
    ScalarNode.prototype.die = function () {
        if (!this.isAlive || this.state === NodeLifeCycle.DETACHING)
            return;
        this.aboutToDie();
        this.finalizeDeath();
    };
    ScalarNode.prototype.finalizeCreation = function () {
        this.baseFinalizeCreation();
    };
    ScalarNode.prototype.aboutToDie = function () {
        this.baseAboutToDie();
    };
    ScalarNode.prototype.finalizeDeath = function () {
        this.baseFinalizeDeath();
    };
    ScalarNode.prototype.fireHook = function (name) {
        this.fireInternalHook(name);
    };
    __decorate([
        mobx.action
    ], ScalarNode.prototype, "die", null);
    return ScalarNode;
}(BaseNode));

var nextNodeId = 1;
var snapshotReactionOptions = {
    onError: function (e) {
        throw e;
    }
};
/**
 * @internal
 * @hidden
 */
var ObjectNode = /** @class */ (function (_super) {
    __extends(ObjectNode, _super);
    function ObjectNode(complexType, parent, subpath, environment, initialValue) {
        var _this = _super.call(this, complexType, parent, subpath, environment) || this;
        _this.nodeId = ++nextNodeId;
        _this.isProtectionEnabled = true;
        _this._autoUnbox = true; // unboxing is disabled when reading child nodes
        _this._isRunningAction = false; // only relevant for root
        _this._hasSnapshotReaction = false;
        _this._observableInstanceState = 0 /* UNINITIALIZED */;
        _this._cachedInitialSnapshotCreated = false;
        _this.unbox = _this.unbox.bind(_this);
        _this._initialSnapshot = freeze(initialValue);
        _this.identifierAttribute = complexType.identifierAttribute;
        if (!parent) {
            _this.identifierCache = new IdentifierCache();
        }
        _this._childNodes = complexType.initializeChildNodes(_this, _this._initialSnapshot);
        // identifier can not be changed during lifecycle of a node
        // so we safely can read it from initial snapshot
        _this.identifier = null;
        _this.unnormalizedIdentifier = null;
        if (_this.identifierAttribute && _this._initialSnapshot) {
            var id = _this._initialSnapshot[_this.identifierAttribute];
            if (id === undefined) {
                // try with the actual node if not (for optional identifiers)
                var childNode = _this._childNodes[_this.identifierAttribute];
                if (childNode) {
                    id = childNode.value;
                }
            }
            if (typeof id !== "string" && typeof id !== "number") {
                throw fail$1("Instance identifier '" + _this.identifierAttribute + "' for type '" + _this.type.name + "' must be a string or a number");
            }
            // normalize internal identifier to string
            _this.identifier = normalizeIdentifier(id);
            _this.unnormalizedIdentifier = id;
        }
        if (!parent) {
            _this.identifierCache.addNodeToCache(_this);
        }
        else {
            parent.root.identifierCache.addNodeToCache(_this);
        }
        return _this;
    }
    ObjectNode.prototype.applyPatches = function (patches) {
        this.createObservableInstanceIfNeeded();
        this._applyPatches(patches);
    };
    ObjectNode.prototype.applySnapshot = function (snapshot) {
        this.createObservableInstanceIfNeeded();
        this._applySnapshot(snapshot);
    };
    ObjectNode.prototype.createObservableInstanceIfNeeded = function () {
        if (this._observableInstanceState === 0 /* UNINITIALIZED */) {
            this.createObservableInstance();
        }
    };
    ObjectNode.prototype.createObservableInstance = function () {
        var e_1, _a;
        if (devMode()) {
            if (this.state !== NodeLifeCycle.INITIALIZING) {
                // istanbul ignore next
                throw fail$1("assertion failed: the creation of the observable instance must be done on the initializing phase");
            }
        }
        this._observableInstanceState = 1 /* CREATING */;
        // make sure the parent chain is created as well
        // array with parent chain from parent to child
        var parentChain = [];
        var parent = this.parent;
        // for performance reasons we never go back further than the most direct
        // uninitialized parent
        // this is done to avoid traversing the whole tree to the root when using
        // the same reference again
        while (parent &&
            parent._observableInstanceState === 0 /* UNINITIALIZED */) {
            parentChain.unshift(parent);
            parent = parent.parent;
        }
        try {
            // initialize the uninitialized parent chain from parent to child
            for (var parentChain_1 = __values(parentChain), parentChain_1_1 = parentChain_1.next(); !parentChain_1_1.done; parentChain_1_1 = parentChain_1.next()) {
                var p = parentChain_1_1.value;
                p.createObservableInstanceIfNeeded();
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (parentChain_1_1 && !parentChain_1_1.done && (_a = parentChain_1.return)) _a.call(parentChain_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        var type = this.type;
        try {
            this.storedValue = type.createNewInstance(this._childNodes);
            this.preboot();
            this._isRunningAction = true;
            type.finalizeNewInstance(this, this.storedValue);
        }
        catch (e) {
            // short-cut to die the instance, to avoid the snapshot computed starting to throw...
            this.state = NodeLifeCycle.DEAD;
            throw e;
        }
        finally {
            this._isRunningAction = false;
        }
        this._observableInstanceState = 2 /* CREATED */;
        // NOTE: we need to touch snapshot, because non-observable
        // "_observableInstanceState" field was touched
        invalidateComputed(this, "snapshot");
        if (this.isRoot)
            this._addSnapshotReaction();
        this._childNodes = EMPTY_OBJECT;
        this.state = NodeLifeCycle.CREATED;
        this.fireHook(Hook.afterCreate);
        this.finalizeCreation();
    };
    Object.defineProperty(ObjectNode.prototype, "root", {
        get: function () {
            var parent = this.parent;
            return parent ? parent.root : this;
        },
        enumerable: true,
        configurable: true
    });
    ObjectNode.prototype.clearParent = function () {
        if (!this.parent)
            return;
        // detach if attached
        this.fireHook(Hook.beforeDetach);
        var previousState = this.state;
        this.state = NodeLifeCycle.DETACHING;
        var root = this.root;
        var newEnv = root.environment;
        var newIdCache = root.identifierCache.splitCache(this);
        try {
            this.parent.removeChild(this.subpath);
            this.baseSetParent(null, "");
            this.environment = newEnv;
            this.identifierCache = newIdCache;
        }
        finally {
            this.state = previousState;
        }
    };
    ObjectNode.prototype.setParent = function (newParent, subpath) {
        var parentChanged = newParent !== this.parent;
        var subpathChanged = subpath !== this.subpath;
        if (!parentChanged && !subpathChanged) {
            return;
        }
        if (devMode()) {
            if (!subpath) {
                // istanbul ignore next
                throw fail$1("assertion failed: subpath expected");
            }
            if (!newParent) {
                // istanbul ignore next
                throw fail$1("assertion failed: new parent expected");
            }
            if (this.parent && parentChanged) {
                throw fail$1("A node cannot exists twice in the state tree. Failed to add " + this + " to path '" + newParent.path + "/" + subpath + "'.");
            }
            if (!this.parent && newParent.root === this) {
                throw fail$1("A state tree is not allowed to contain itself. Cannot assign " + this + " to path '" + newParent.path + "/" + subpath + "'");
            }
            if (!this.parent &&
                !!this.environment &&
                this.environment !== newParent.root.environment) {
                throw fail$1("A state tree cannot be made part of another state tree as long as their environments are different.");
            }
        }
        if (parentChanged) {
            // attach to new parent
            this.environment = undefined; // will use root's
            newParent.root.identifierCache.mergeCache(this);
            this.baseSetParent(newParent, subpath);
            this.fireHook(Hook.afterAttach);
        }
        else if (subpathChanged) {
            // moving to a new subpath on the same parent
            this.baseSetParent(this.parent, subpath);
        }
    };
    ObjectNode.prototype.fireHook = function (name) {
        var _this = this;
        this.fireInternalHook(name);
        var fn = this.storedValue &&
            typeof this.storedValue === "object" &&
            this.storedValue[name];
        if (typeof fn === "function") {
            // we check for it to allow old mobx peer dependencies that don't have the method to work (even when still bugged)
            if (mobx._allowStateChangesInsideComputed) {
                mobx._allowStateChangesInsideComputed(function () {
                    fn.apply(_this.storedValue);
                });
            }
            else {
                fn.apply(this.storedValue);
            }
        }
    };
    Object.defineProperty(ObjectNode.prototype, "snapshot", {
        // advantage of using computed for a snapshot is that nicely respects transactions etc.
        get: function () {
            return freeze(this.getSnapshot());
        },
        enumerable: true,
        configurable: true
    });
    // NOTE: we use this method to get snapshot without creating @computed overhead
    ObjectNode.prototype.getSnapshot = function () {
        if (!this.isAlive)
            return this._snapshotUponDeath;
        return this._observableInstanceState === 2 /* CREATED */
            ? this._getActualSnapshot()
            : this._getCachedInitialSnapshot();
    };
    ObjectNode.prototype._getActualSnapshot = function () {
        return this.type.getSnapshot(this);
    };
    ObjectNode.prototype._getCachedInitialSnapshot = function () {
        if (!this._cachedInitialSnapshotCreated) {
            var type = this.type;
            var childNodes = this._childNodes;
            var snapshot = this._initialSnapshot;
            this._cachedInitialSnapshot = type.processInitialSnapshot(childNodes, snapshot);
            this._cachedInitialSnapshotCreated = true;
        }
        return this._cachedInitialSnapshot;
    };
    ObjectNode.prototype.isRunningAction = function () {
        if (this._isRunningAction)
            return true;
        if (this.isRoot)
            return false;
        return this.parent.isRunningAction();
    };
    ObjectNode.prototype.assertAlive = function (context) {
        var livelinessChecking = getLivelinessChecking();
        if (!this.isAlive && livelinessChecking !== "ignore") {
            var error = this._getAssertAliveError(context);
            switch (livelinessChecking) {
                case "error":
                    throw fail$1(error);
                case "warn":
                    warnError(error);
            }
        }
    };
    ObjectNode.prototype._getAssertAliveError = function (context) {
        var escapedPath = this.getEscapedPath(false) || this.pathUponDeath || "";
        var subpath = (context.subpath && escapeJsonPath(context.subpath)) || "";
        var actionContext = context.actionContext || getCurrentActionContext();
        // try to use a real action context if possible since it includes the action name
        if (actionContext && actionContext.type !== "action" && actionContext.parentActionEvent) {
            actionContext = actionContext.parentActionEvent;
        }
        var actionFullPath = "";
        if (actionContext && actionContext.name != null) {
            // try to use the context, and if it not available use the node one
            var actionPath = (actionContext && actionContext.context && getPath(actionContext.context)) ||
                escapedPath;
            actionFullPath = actionPath + "." + actionContext.name + "()";
        }
        return "You are trying to read or write to an object that is no longer part of a state tree. (Object type: '" + this.type.name + "', Path upon death: '" + escapedPath + "', Subpath: '" + subpath + "', Action: '" + actionFullPath + "'). Either detach nodes first, or don't use objects after removing / replacing them in the tree.";
    };
    ObjectNode.prototype.getChildNode = function (subpath) {
        this.assertAlive({
            subpath: subpath
        });
        this._autoUnbox = false;
        try {
            return this._observableInstanceState === 2 /* CREATED */
                ? this.type.getChildNode(this, subpath)
                : this._childNodes[subpath];
        }
        finally {
            this._autoUnbox = true;
        }
    };
    ObjectNode.prototype.getChildren = function () {
        this.assertAlive(EMPTY_OBJECT);
        this._autoUnbox = false;
        try {
            return this._observableInstanceState === 2 /* CREATED */
                ? this.type.getChildren(this)
                : convertChildNodesToArray(this._childNodes);
        }
        finally {
            this._autoUnbox = true;
        }
    };
    ObjectNode.prototype.getChildType = function (propertyName) {
        return this.type.getChildType(propertyName);
    };
    Object.defineProperty(ObjectNode.prototype, "isProtected", {
        get: function () {
            return this.root.isProtectionEnabled;
        },
        enumerable: true,
        configurable: true
    });
    ObjectNode.prototype.assertWritable = function (context) {
        this.assertAlive(context);
        if (!this.isRunningAction() && this.isProtected) {
            throw fail$1("Cannot modify '" + this + "', the object is protected and can only be modified by using an action.");
        }
    };
    ObjectNode.prototype.removeChild = function (subpath) {
        this.type.removeChild(this, subpath);
    };
    // bound on the constructor
    ObjectNode.prototype.unbox = function (childNode) {
        if (!childNode)
            return childNode;
        this.assertAlive({
            subpath: childNode.subpath || childNode.subpathUponDeath
        });
        return this._autoUnbox ? childNode.value : childNode;
    };
    ObjectNode.prototype.toString = function () {
        var path = (this.isAlive ? this.path : this.pathUponDeath) || "<root>";
        var identifier = this.identifier ? "(id: " + this.identifier + ")" : "";
        return this.type.name + "@" + path + identifier + (this.isAlive ? "" : " [dead]");
    };
    ObjectNode.prototype.finalizeCreation = function () {
        var _this = this;
        this.baseFinalizeCreation(function () {
            var e_2, _a;
            try {
                for (var _b = __values(_this.getChildren()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var child = _c.value;
                    child.finalizeCreation();
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            _this.fireInternalHook(Hook.afterCreationFinalization);
        });
    };
    ObjectNode.prototype.detach = function () {
        if (!this.isAlive)
            throw fail$1("Error while detaching, node is not alive.");
        this.clearParent();
    };
    ObjectNode.prototype.preboot = function () {
        var self = this;
        this._applyPatches = createActionInvoker(this.storedValue, "@APPLY_PATCHES", function (patches) {
            patches.forEach(function (patch) {
                var parts = splitJsonPath(patch.path);
                var node = resolveNodeByPathParts(self, parts.slice(0, -1));
                node.applyPatchLocally(parts[parts.length - 1], patch);
            });
        });
        this._applySnapshot = createActionInvoker(this.storedValue, "@APPLY_SNAPSHOT", function (snapshot) {
            // if the snapshot is the same as the current one, avoid performing a reconcile
            if (snapshot === self.snapshot)
                return;
            // else, apply it by calling the type logic
            return self.type.applySnapshot(self, snapshot);
        });
        addHiddenFinalProp(this.storedValue, "$treenode", this);
        addHiddenFinalProp(this.storedValue, "toJSON", toJSON);
    };
    ObjectNode.prototype.die = function () {
        if (!this.isAlive || this.state === NodeLifeCycle.DETACHING)
            return;
        this.aboutToDie();
        this.finalizeDeath();
    };
    ObjectNode.prototype.aboutToDie = function () {
        if (this._observableInstanceState === 0 /* UNINITIALIZED */) {
            return;
        }
        this.getChildren().forEach(function (node) {
            node.aboutToDie();
        });
        // beforeDestroy should run before the disposers since else we could end up in a situation where
        // a disposer added with addDisposer at this stage (beforeDestroy) is actually never released
        this.baseAboutToDie();
        this._internalEventsEmit("dispose" /* Dispose */);
        this._internalEventsClear("dispose" /* Dispose */);
    };
    ObjectNode.prototype.finalizeDeath = function () {
        // invariant: not called directly but from "die"
        this.getChildren().forEach(function (node) {
            node.finalizeDeath();
        });
        this.root.identifierCache.notifyDied(this);
        // "kill" the computed prop and just store the last snapshot
        var snapshot = this.snapshot;
        this._snapshotUponDeath = snapshot;
        this._internalEventsClearAll();
        this.baseFinalizeDeath();
    };
    ObjectNode.prototype.onSnapshot = function (onChange) {
        this._addSnapshotReaction();
        return this._internalEventsRegister("snapshot" /* Snapshot */, onChange);
    };
    ObjectNode.prototype.emitSnapshot = function (snapshot) {
        this._internalEventsEmit("snapshot" /* Snapshot */, snapshot);
    };
    ObjectNode.prototype.onPatch = function (handler) {
        return this._internalEventsRegister("patch" /* Patch */, handler);
    };
    ObjectNode.prototype.emitPatch = function (basePatch, source) {
        if (this._internalEventsHasSubscribers("patch" /* Patch */)) {
            var localizedPatch = extend({}, basePatch, {
                path: source.path.substr(this.path.length) + "/" + basePatch.path // calculate the relative path of the patch
            });
            var _a = __read(splitPatch(localizedPatch), 2), patch = _a[0], reversePatch = _a[1];
            this._internalEventsEmit("patch" /* Patch */, patch, reversePatch);
        }
        if (this.parent)
            this.parent.emitPatch(basePatch, source);
    };
    ObjectNode.prototype.hasDisposer = function (disposer) {
        return this._internalEventsHas("dispose" /* Dispose */, disposer);
    };
    ObjectNode.prototype.addDisposer = function (disposer) {
        if (!this.hasDisposer(disposer)) {
            this._internalEventsRegister("dispose" /* Dispose */, disposer, true);
            return;
        }
        throw fail$1("cannot add a disposer when it is already registered for execution");
    };
    ObjectNode.prototype.removeDisposer = function (disposer) {
        if (!this._internalEventsHas("dispose" /* Dispose */, disposer)) {
            throw fail$1("cannot remove a disposer which was never registered for execution");
        }
        this._internalEventsUnregister("dispose" /* Dispose */, disposer);
    };
    ObjectNode.prototype.removeMiddleware = function (middleware) {
        if (this.middlewares) {
            var index = this.middlewares.indexOf(middleware);
            if (index >= 0) {
                this.middlewares.splice(index, 1);
            }
        }
    };
    ObjectNode.prototype.addMiddleWare = function (handler, includeHooks) {
        var _this = this;
        if (includeHooks === void 0) { includeHooks = true; }
        var middleware = { handler: handler, includeHooks: includeHooks };
        if (!this.middlewares)
            this.middlewares = [middleware];
        else
            this.middlewares.push(middleware);
        return function () {
            _this.removeMiddleware(middleware);
        };
    };
    ObjectNode.prototype.applyPatchLocally = function (subpath, patch) {
        this.assertWritable({
            subpath: subpath
        });
        this.createObservableInstanceIfNeeded();
        this.type.applyPatchLocally(this, subpath, patch);
    };
    ObjectNode.prototype._addSnapshotReaction = function () {
        var _this = this;
        if (!this._hasSnapshotReaction) {
            var snapshotDisposer = mobx.reaction(function () { return _this.snapshot; }, function (snapshot) { return _this.emitSnapshot(snapshot); }, snapshotReactionOptions);
            this.addDisposer(snapshotDisposer);
            this._hasSnapshotReaction = true;
        }
    };
    // we proxy the methods to avoid creating an EventHandlers instance when it is not needed
    ObjectNode.prototype._internalEventsHasSubscribers = function (event) {
        return !!this._internalEvents && this._internalEvents.hasSubscribers(event);
    };
    ObjectNode.prototype._internalEventsRegister = function (event, eventHandler, atTheBeginning) {
        if (atTheBeginning === void 0) { atTheBeginning = false; }
        if (!this._internalEvents) {
            this._internalEvents = new EventHandlers();
        }
        return this._internalEvents.register(event, eventHandler, atTheBeginning);
    };
    ObjectNode.prototype._internalEventsHas = function (event, eventHandler) {
        return !!this._internalEvents && this._internalEvents.has(event, eventHandler);
    };
    ObjectNode.prototype._internalEventsUnregister = function (event, eventHandler) {
        if (this._internalEvents) {
            this._internalEvents.unregister(event, eventHandler);
        }
    };
    ObjectNode.prototype._internalEventsEmit = function (event) {
        var _a;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (this._internalEvents) {
            (_a = this._internalEvents).emit.apply(_a, __spread([event], args));
        }
    };
    ObjectNode.prototype._internalEventsClear = function (event) {
        if (this._internalEvents) {
            this._internalEvents.clear(event);
        }
    };
    ObjectNode.prototype._internalEventsClearAll = function () {
        if (this._internalEvents) {
            this._internalEvents.clearAll();
        }
    };
    __decorate([
        mobx.action
    ], ObjectNode.prototype, "createObservableInstance", null);
    __decorate([
        mobx.computed
    ], ObjectNode.prototype, "snapshot", null);
    __decorate([
        mobx.action
    ], ObjectNode.prototype, "detach", null);
    __decorate([
        mobx.action
    ], ObjectNode.prototype, "die", null);
    return ObjectNode;
}(BaseNode));

/**
 * @internal
 * @hidden
 */
var TypeFlags;
(function (TypeFlags) {
    TypeFlags[TypeFlags["String"] = 1] = "String";
    TypeFlags[TypeFlags["Number"] = 2] = "Number";
    TypeFlags[TypeFlags["Boolean"] = 4] = "Boolean";
    TypeFlags[TypeFlags["Date"] = 8] = "Date";
    TypeFlags[TypeFlags["Literal"] = 16] = "Literal";
    TypeFlags[TypeFlags["Array"] = 32] = "Array";
    TypeFlags[TypeFlags["Map"] = 64] = "Map";
    TypeFlags[TypeFlags["Object"] = 128] = "Object";
    TypeFlags[TypeFlags["Frozen"] = 256] = "Frozen";
    TypeFlags[TypeFlags["Optional"] = 512] = "Optional";
    TypeFlags[TypeFlags["Reference"] = 1024] = "Reference";
    TypeFlags[TypeFlags["Identifier"] = 2048] = "Identifier";
    TypeFlags[TypeFlags["Late"] = 4096] = "Late";
    TypeFlags[TypeFlags["Refinement"] = 8192] = "Refinement";
    TypeFlags[TypeFlags["Union"] = 16384] = "Union";
    TypeFlags[TypeFlags["Null"] = 32768] = "Null";
    TypeFlags[TypeFlags["Undefined"] = 65536] = "Undefined";
    TypeFlags[TypeFlags["Integer"] = 131072] = "Integer";
    TypeFlags[TypeFlags["Custom"] = 262144] = "Custom";
    TypeFlags[TypeFlags["SnapshotProcessor"] = 524288] = "SnapshotProcessor";
})(TypeFlags || (TypeFlags = {}));
/**
 * @internal
 * @hidden
 */
var cannotDetermineSubtype = "cannotDetermine";
/**
 * A base type produces a MST node (Node in the state tree)
 *
 * @internal
 * @hidden
 */
var BaseType = /** @class */ (function () {
    function BaseType(name) {
        this.isType = true;
        this.name = name;
    }
    BaseType.prototype.create = function (snapshot, environment) {
        typecheckInternal(this, snapshot);
        return this.instantiate(null, "", environment, snapshot).value;
    };
    BaseType.prototype.getSnapshot = function (node, applyPostProcess) {
        // istanbul ignore next
        throw fail$1("unimplemented method");
    };
    BaseType.prototype.isAssignableFrom = function (type) {
        return type === this;
    };
    BaseType.prototype.validate = function (value, context) {
        var node = getStateTreeNodeSafe(value);
        if (node) {
            var valueType = getType(value);
            return this.isAssignableFrom(valueType)
                ? typeCheckSuccess()
                : typeCheckFailure(context, value);
            // it is tempting to compare snapshots, but in that case we should always clone on assignments...
        }
        return this.isValidSnapshot(value, context);
    };
    BaseType.prototype.is = function (thing) {
        return this.validate(thing, [{ path: "", type: this }]).length === 0;
    };
    Object.defineProperty(BaseType.prototype, "Type", {
        get: function () {
            // istanbul ignore next
            throw fail$1("Factory.Type should not be actually called. It is just a Type signature that can be used at compile time with Typescript, by using `typeof type.Type`");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BaseType.prototype, "TypeWithoutSTN", {
        get: function () {
            // istanbul ignore next
            throw fail$1("Factory.TypeWithoutSTN should not be actually called. It is just a Type signature that can be used at compile time with Typescript, by using `typeof type.TypeWithoutSTN`");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BaseType.prototype, "SnapshotType", {
        get: function () {
            // istanbul ignore next
            throw fail$1("Factory.SnapshotType should not be actually called. It is just a Type signature that can be used at compile time with Typescript, by using `typeof type.SnapshotType`");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BaseType.prototype, "CreationType", {
        get: function () {
            // istanbul ignore next
            throw fail$1("Factory.CreationType should not be actually called. It is just a Type signature that can be used at compile time with Typescript, by using `typeof type.CreationType`");
        },
        enumerable: true,
        configurable: true
    });
    __decorate([
        mobx.action
    ], BaseType.prototype, "create", null);
    return BaseType;
}());
/**
 * A complex type produces a MST node (Node in the state tree)
 *
 * @internal
 * @hidden
 */
var ComplexType = /** @class */ (function (_super) {
    __extends(ComplexType, _super);
    function ComplexType(name) {
        return _super.call(this, name) || this;
    }
    ComplexType.prototype.create = function (snapshot, environment) {
        if (snapshot === void 0) { snapshot = this.getDefaultSnapshot(); }
        return _super.prototype.create.call(this, snapshot, environment);
    };
    ComplexType.prototype.getValue = function (node) {
        node.createObservableInstanceIfNeeded();
        return node.storedValue;
    };
    ComplexType.prototype.tryToReconcileNode = function (current, newValue) {
        if (current.isDetaching)
            return false;
        if (current.snapshot === newValue) {
            // newValue is the current snapshot of the node, noop
            return true;
        }
        if (isStateTreeNode(newValue) && getStateTreeNode(newValue) === current) {
            // the current node is the same as the new one
            return true;
        }
        if (current.type === this &&
            isMutable(newValue) &&
            !isStateTreeNode(newValue) &&
            (!current.identifierAttribute ||
                current.identifier ===
                    normalizeIdentifier(newValue[current.identifierAttribute]))) {
            // the newValue has no node, so can be treated like a snapshot
            // we can reconcile
            current.applySnapshot(newValue);
            return true;
        }
        return false;
    };
    ComplexType.prototype.reconcile = function (current, newValue, parent, subpath) {
        var nodeReconciled = this.tryToReconcileNode(current, newValue);
        if (nodeReconciled) {
            current.setParent(parent, subpath);
            return current;
        }
        // current node cannot be recycled in any way
        current.die(); // noop if detaching
        // attempt to reuse the new one
        if (isStateTreeNode(newValue) && this.isAssignableFrom(getType(newValue))) {
            // newValue is a Node as well, move it here..
            var newNode = getStateTreeNode(newValue);
            newNode.setParent(parent, subpath);
            return newNode;
        }
        // nothing to do, we have to create a new node
        return this.instantiate(parent, subpath, undefined, newValue);
    };
    ComplexType.prototype.getSubTypes = function () {
        return null;
    };
    __decorate([
        mobx.action
    ], ComplexType.prototype, "create", null);
    return ComplexType;
}(BaseType));
/**
 * @internal
 * @hidden
 */
var SimpleType = /** @class */ (function (_super) {
    __extends(SimpleType, _super);
    function SimpleType() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SimpleType.prototype.createNewInstance = function (snapshot) {
        return snapshot;
    };
    SimpleType.prototype.getValue = function (node) {
        // if we ever find a case where scalar nodes can be accessed without iterating through its parent
        // uncomment this to make sure the parent chain is created when this is accessed
        // if (node.parent) {
        //     node.parent.createObservableInstanceIfNeeded()
        // }
        return node.storedValue;
    };
    SimpleType.prototype.getSnapshot = function (node) {
        return node.storedValue;
    };
    SimpleType.prototype.reconcile = function (current, newValue, parent, subpath) {
        // reconcile only if type and value are still the same, and only if the node is not detaching
        if (!current.isDetaching && current.type === this && current.storedValue === newValue) {
            return current;
        }
        var res = this.instantiate(parent, subpath, undefined, newValue);
        current.die(); // noop if detaching
        return res;
    };
    SimpleType.prototype.getSubTypes = function () {
        return null;
    };
    return SimpleType;
}(BaseType));
/**
 * Returns if a given value represents a type.
 *
 * @param value Value to check.
 * @returns `true` if the value is a type.
 */
function isType(value) {
    return typeof value === "object" && value && value.isType === true;
}
/**
 * @internal
 * @hidden
 */
function assertIsType(type, argNumber) {
    assertArg(type, isType, "mobx-state-tree type", argNumber);
}

var runningActions = new Map();
/**
 * Note: Consider migrating to `createActionTrackingMiddleware2`, it is easier to use.
 *
 * Convenience utility to create action based middleware that supports async processes more easily.
 * All hooks are called for both synchronous and asynchronous actions. Except that either `onSuccess` or `onFail` is called
 *
 * The create middleware tracks the process of an action (assuming it passes the `filter`).
 * `onResume` can return any value, which will be passed as second argument to any other hook. This makes it possible to keep state during a process.
 *
 * See the `atomic` middleware for an example
 *
 * @param hooks
 * @returns
 */
function createActionTrackingMiddleware(hooks) {
    return function actionTrackingMiddleware(call, next, abort) {
        switch (call.type) {
            case "action": {
                if (!hooks.filter || hooks.filter(call) === true) {
                    var context = hooks.onStart(call);
                    hooks.onResume(call, context);
                    runningActions.set(call.id, {
                        call: call,
                        context: context,
                        async: false
                    });
                    try {
                        var res = next(call);
                        hooks.onSuspend(call, context);
                        if (runningActions.get(call.id).async === false) {
                            runningActions.delete(call.id);
                            hooks.onSuccess(call, context, res);
                        }
                        return res;
                    }
                    catch (e) {
                        runningActions.delete(call.id);
                        hooks.onFail(call, context, e);
                        throw e;
                    }
                }
                else {
                    return next(call);
                }
            }
            case "flow_spawn": {
                var root = runningActions.get(call.rootId);
                root.async = true;
                return next(call);
            }
            case "flow_resume":
            case "flow_resume_error": {
                var root = runningActions.get(call.rootId);
                hooks.onResume(call, root.context);
                try {
                    return next(call);
                }
                finally {
                    hooks.onSuspend(call, root.context);
                }
            }
            case "flow_throw": {
                var root = runningActions.get(call.rootId);
                runningActions.delete(call.rootId);
                hooks.onFail(call, root.context, call.args[0]);
                return next(call);
            }
            case "flow_return": {
                var root = runningActions.get(call.rootId);
                runningActions.delete(call.rootId);
                hooks.onSuccess(call, root.context, call.args[0]);
                return next(call);
            }
        }
    };
}

var RunningAction = /** @class */ (function () {
    function RunningAction(hooks, call) {
        this.hooks = hooks;
        this.call = call;
        this.flowsPending = 0;
        this.running = true;
        if (hooks) {
            hooks.onStart(call);
        }
    }
    RunningAction.prototype.finish = function (error) {
        if (this.running) {
            this.running = false;
            if (this.hooks) {
                this.hooks.onFinish(this.call, error);
            }
        }
    };
    RunningAction.prototype.incFlowsPending = function () {
        this.flowsPending++;
    };
    RunningAction.prototype.decFlowsPending = function () {
        this.flowsPending--;
    };
    Object.defineProperty(RunningAction.prototype, "hasFlowsPending", {
        get: function () {
            return this.flowsPending > 0;
        },
        enumerable: true,
        configurable: true
    });
    return RunningAction;
}());
/**
 * Convenience utility to create action based middleware that supports async processes more easily.
 * The flow is like this:
 * - for each action: if filter passes -> `onStart` -> (inner actions recursively) -> `onFinish`
 *
 * Example: if we had an action `a` that called inside an action `b1`, then `b2` the flow would be:
 * - `filter(a)`
 * - `onStart(a)`
 *   - `filter(b1)`
 *   - `onStart(b1)`
 *   - `onFinish(b1)`
 *   - `filter(b2)`
 *   - `onStart(b2)`
 *   - `onFinish(b2)`
 * - `onFinish(a)`
 *
 * The flow is the same no matter if the actions are sync or async.
 *
 * See the `atomic` middleware for an example
 *
 * @param hooks
 * @returns
 */
function createActionTrackingMiddleware2(middlewareHooks) {
    var runningActions = new WeakMap();
    return function actionTrackingMiddleware(call, next) {
        // find parentRunningAction
        var parentRunningAction = call.parentActionEvent
            ? runningActions.get(call.parentActionEvent)
            : undefined;
        if (call.type === "action") {
            var newCall = __assign(__assign({}, call), { 
                // make a shallow copy of the parent action env
                env: parentRunningAction && parentRunningAction.call.env, parentCall: parentRunningAction && parentRunningAction.call });
            var passesFilter = !middlewareHooks.filter || middlewareHooks.filter(newCall);
            var hooks = passesFilter ? middlewareHooks : undefined;
            var runningAction = new RunningAction(hooks, newCall);
            runningActions.set(call, runningAction);
            var res = void 0;
            try {
                res = next(call);
            }
            catch (e) {
                runningAction.finish(e);
                throw e;
            }
            if (!runningAction.hasFlowsPending) {
                // sync action finished
                runningAction.finish();
            }
            return res;
        }
        else {
            if (!parentRunningAction) {
                return next(call);
            }
            switch (call.type) {
                case "flow_spawn": {
                    parentRunningAction.incFlowsPending();
                    return next(call);
                }
                case "flow_resume":
                case "flow_resume_error": {
                    return next(call);
                }
                case "flow_throw": {
                    var error = call.args[0];
                    try {
                        return next(call);
                    }
                    finally {
                        parentRunningAction.decFlowsPending();
                        if (!parentRunningAction.hasFlowsPending) {
                            parentRunningAction.finish(error);
                        }
                    }
                }
                case "flow_return": {
                    try {
                        return next(call);
                    }
                    finally {
                        parentRunningAction.decFlowsPending();
                        if (!parentRunningAction.hasFlowsPending) {
                            parentRunningAction.finish();
                        }
                    }
                }
            }
        }
    };
}

function serializeArgument(node, actionName, index, arg) {
    if (arg instanceof Date)
        return { $MST_DATE: arg.getTime() };
    if (isPrimitive(arg))
        return arg;
    // We should not serialize MST nodes, even if we can, because we don't know if the receiving party can handle a raw snapshot instead of an
    // MST type instance. So if one wants to serialize a MST node that was pass in, either explitly pass: 1: an id, 2: a (relative) path, 3: a snapshot
    if (isStateTreeNode(arg))
        return serializeTheUnserializable("[MSTNode: " + getType(arg).name + "]");
    if (typeof arg === "function")
        return serializeTheUnserializable("[function]");
    if (typeof arg === "object" && !isPlainObject(arg) && !isArray(arg))
        return serializeTheUnserializable("[object " + ((arg && arg.constructor && arg.constructor.name) ||
            "Complex Object") + "]");
    try {
        // Check if serializable, cycle free etc...
        // MWE: there must be a better way....
        JSON.stringify(arg); // or throws
        return arg;
    }
    catch (e) {
        return serializeTheUnserializable("" + e);
    }
}
function deserializeArgument(adm, value) {
    if (value && typeof value === "object" && "$MST_DATE" in value)
        return new Date(value["$MST_DATE"]);
    return value;
}
function serializeTheUnserializable(baseType) {
    return {
        $MST_UNSERIALIZABLE: true,
        type: baseType
    };
}
/**
 * Applies an action or a series of actions in a single MobX transaction.
 * Does not return any value
 * Takes an action description as produced by the `onAction` middleware.
 *
 * @param target
 * @param actions
 */
function applyAction(target, actions) {
    // check all arguments
    assertIsStateTreeNode(target, 1);
    assertArg(actions, function (a) { return typeof a === "object"; }, "object or array", 2);
    mobx.runInAction(function () {
        asArray(actions).forEach(function (action) { return baseApplyAction(target, action); });
    });
}
function baseApplyAction(target, action) {
    var resolvedTarget = tryResolve(target, action.path || "");
    if (!resolvedTarget)
        throw fail$1("Invalid action path: " + (action.path || ""));
    var node = getStateTreeNode(resolvedTarget);
    // Reserved functions
    if (action.name === "@APPLY_PATCHES") {
        return applyPatch.call(null, resolvedTarget, action.args[0]);
    }
    if (action.name === "@APPLY_SNAPSHOT") {
        return applySnapshot.call(null, resolvedTarget, action.args[0]);
    }
    if (!(typeof resolvedTarget[action.name] === "function"))
        throw fail$1("Action '" + action.name + "' does not exist in '" + node.path + "'");
    return resolvedTarget[action.name].apply(resolvedTarget, action.args ? action.args.map(function (v) { return deserializeArgument(node, v); }) : []);
}
/**
 * Small abstraction around `onAction` and `applyAction`, attaches an action listener to a tree and records all the actions emitted.
 * Returns an recorder object with the following signature:
 *
 * Example:
 * ```ts
 * export interface IActionRecorder {
 *      // the recorded actions
 *      actions: ISerializedActionCall[]
 *      // true if currently recording
 *      recording: boolean
 *      // stop recording actions
 *      stop(): void
 *      // resume recording actions
 *      resume(): void
 *      // apply all the recorded actions on the given object
 *      replay(target: IAnyStateTreeNode): void
 * }
 * ```
 *
 * The optional filter function allows to skip recording certain actions.
 *
 * @param subject
 * @returns
 */
function recordActions(subject, filter) {
    // check all arguments
    assertIsStateTreeNode(subject, 1);
    var actions = [];
    var listener = function (call) {
        var recordThis = filter ? filter(call, getRunningActionContext()) : true;
        if (recordThis) {
            actions.push(call);
        }
    };
    var disposer;
    var recorder = {
        actions: actions,
        get recording() {
            return !!disposer;
        },
        stop: function () {
            if (disposer) {
                disposer();
                disposer = undefined;
            }
        },
        resume: function () {
            if (disposer)
                return;
            disposer = onAction(subject, listener);
        },
        replay: function (target) {
            applyAction(target, actions);
        }
    };
    recorder.resume();
    return recorder;
}
/**
 * Registers a function that will be invoked for each action that is called on the provided model instance, or to any of its children.
 * See [actions](https://github.com/mobxjs/mobx-state-tree#actions) for more details. onAction events are emitted only for the outermost called action in the stack.
 * Action can also be intercepted by middleware using addMiddleware to change the function call before it will be run.
 *
 * Not all action arguments might be serializable. For unserializable arguments, a struct like `{ $MST_UNSERIALIZABLE: true, type: "someType" }` will be generated.
 * MST Nodes are considered non-serializable as well (they could be serialized as there snapshot, but it is uncertain whether an replaying party will be able to handle such a non-instantiated snapshot).
 * Rather, when using `onAction` middleware, one should consider in passing arguments which are 1: an id, 2: a (relative) path, or 3: a snapshot. Instead of a real MST node.
 *
 * Example:
 * ```ts
 * const Todo = types.model({
 *   task: types.string
 * })
 *
 * const TodoStore = types.model({
 *   todos: types.array(Todo)
 * }).actions(self => ({
 *   add(todo) {
 *     self.todos.push(todo);
 *   }
 * }))
 *
 * const s = TodoStore.create({ todos: [] })
 *
 * let disposer = onAction(s, (call) => {
 *   console.log(call);
 * })
 *
 * s.add({ task: "Grab a coffee" })
 * // Logs: { name: "add", path: "", args: [{ task: "Grab a coffee" }] }
 * ```
 *
 * @param target
 * @param listener
 * @param attachAfter (default false) fires the listener *after* the action has executed instead of before.
 * @returns
 */
function onAction(target, listener, attachAfter) {
    if (attachAfter === void 0) { attachAfter = false; }
    // check all arguments
    assertIsStateTreeNode(target, 1);
    if (devMode()) {
        if (!isRoot(target))
            warnError("Warning: Attaching onAction listeners to non root nodes is dangerous: No events will be emitted for actions initiated higher up in the tree.");
        if (!isProtected(target))
            warnError("Warning: Attaching onAction listeners to non protected nodes is dangerous: No events will be emitted for direct modifications without action.");
    }
    return addMiddleware(target, function handler(rawCall, next) {
        if (rawCall.type === "action" && rawCall.id === rawCall.rootId) {
            var sourceNode_1 = getStateTreeNode(rawCall.context);
            var info = {
                name: rawCall.name,
                path: getRelativePathBetweenNodes(getStateTreeNode(target), sourceNode_1),
                args: rawCall.args.map(function (arg, index) {
                    return serializeArgument(sourceNode_1, rawCall.name, index, arg);
                })
            };
            if (attachAfter) {
                var res = next(rawCall);
                listener(info);
                return res;
            }
            else {
                listener(info);
                return next(rawCall);
            }
        }
        else {
            return next(rawCall);
        }
    });
}

var nextActionId = 1;
var currentActionContext;
/**
 * @internal
 * @hidden
 */
function getCurrentActionContext() {
    return currentActionContext;
}
/**
 * @internal
 * @hidden
 */
function getNextActionId() {
    return nextActionId++;
}
// TODO: optimize away entire action context if there is no middleware in tree?
/**
 * @internal
 * @hidden
 */
function runWithActionContext(context, fn) {
    var node = getStateTreeNode(context.context);
    if (context.type === "action") {
        node.assertAlive({
            actionContext: context
        });
    }
    var baseIsRunningAction = node._isRunningAction;
    node._isRunningAction = true;
    var previousContext = currentActionContext;
    currentActionContext = context;
    try {
        return runMiddleWares(node, context, fn);
    }
    finally {
        currentActionContext = previousContext;
        node._isRunningAction = baseIsRunningAction;
    }
}
/**
 * @internal
 * @hidden
 */
function getParentActionContext(parentContext) {
    if (!parentContext)
        return undefined;
    if (parentContext.type === "action")
        return parentContext;
    return parentContext.parentActionEvent;
}
/**
 * @internal
 * @hidden
 */
function createActionInvoker(target, name, fn) {
    var res = function () {
        var id = getNextActionId();
        var parentContext = currentActionContext;
        var parentActionContext = getParentActionContext(parentContext);
        return runWithActionContext({
            type: "action",
            name: name,
            id: id,
            args: argsToArray(arguments),
            context: target,
            tree: getRoot(target),
            rootId: parentContext ? parentContext.rootId : id,
            parentId: parentContext ? parentContext.id : 0,
            allParentIds: parentContext
                ? __spread(parentContext.allParentIds, [parentContext.id]) : [],
            parentEvent: parentContext,
            parentActionEvent: parentActionContext
        }, fn);
    };
    res._isMSTAction = true;
    return res;
}
/**
 * Middleware can be used to intercept any action is invoked on the subtree where it is attached.
 * If a tree is protected (by default), this means that any mutation of the tree will pass through your middleware.
 *
 * For more details, see the [middleware docs](concepts/middleware.md)
 *
 * @param target Node to apply the middleware to.
 * @param middleware Middleware to apply.
 * @returns A callable function to dispose the middleware.
 */
function addMiddleware(target, handler, includeHooks) {
    if (includeHooks === void 0) { includeHooks = true; }
    var node = getStateTreeNode(target);
    if (devMode()) {
        if (!node.isProtectionEnabled) {
            warnError("It is recommended to protect the state tree before attaching action middleware, as otherwise it cannot be guaranteed that all changes are passed through middleware. See `protect`");
        }
    }
    return node.addMiddleWare(handler, includeHooks);
}
/**
 * Binds middleware to a specific action.
 *
 * Example:
 * ```ts
 * type.actions(self => {
 *   function takeA____() {
 *       self.toilet.donate()
 *       self.wipe()
 *       self.wipe()
 *       self.toilet.flush()
 *   }
 *   return {
 *     takeA____: decorate(atomic, takeA____)
 *   }
 * })
 * ```
 *
 * @param handler
 * @param fn
 * @param includeHooks
 * @returns The original function
 */
function decorate(handler, fn, includeHooks) {
    if (includeHooks === void 0) { includeHooks = true; }
    var middleware = { handler: handler, includeHooks: includeHooks };
    fn.$mst_middleware = fn.$mst_middleware || [];
    fn.$mst_middleware.push(middleware);
    return fn;
}
var CollectedMiddlewares = /** @class */ (function () {
    function CollectedMiddlewares(node, fn) {
        this.arrayIndex = 0;
        this.inArrayIndex = 0;
        this.middlewares = [];
        // we just push middleware arrays into an array of arrays to avoid making copies
        if (fn.$mst_middleware) {
            this.middlewares.push(fn.$mst_middleware);
        }
        var n = node;
        // Find all middlewares. Optimization: cache this?
        while (n) {
            if (n.middlewares)
                this.middlewares.push(n.middlewares);
            n = n.parent;
        }
    }
    Object.defineProperty(CollectedMiddlewares.prototype, "isEmpty", {
        get: function () {
            return this.middlewares.length <= 0;
        },
        enumerable: true,
        configurable: true
    });
    CollectedMiddlewares.prototype.getNextMiddleware = function () {
        var array = this.middlewares[this.arrayIndex];
        if (!array)
            return undefined;
        var item = array[this.inArrayIndex++];
        if (!item) {
            this.arrayIndex++;
            this.inArrayIndex = 0;
            return this.getNextMiddleware();
        }
        return item;
    };
    return CollectedMiddlewares;
}());
function runMiddleWares(node, baseCall, originalFn) {
    var middlewares = new CollectedMiddlewares(node, originalFn);
    // Short circuit
    if (middlewares.isEmpty)
        return mobx.action(originalFn).apply(null, baseCall.args);
    var result = null;
    function runNextMiddleware(call) {
        var middleware = middlewares.getNextMiddleware();
        var handler = middleware && middleware.handler;
        if (!handler) {
            return mobx.action(originalFn).apply(null, call.args);
        }
        // skip hooks if asked to
        if (!middleware.includeHooks && Hook[call.name]) {
            return runNextMiddleware(call);
        }
        var nextInvoked = false;
        function next(call2, callback) {
            nextInvoked = true;
            // the result can contain
            // - the non manipulated return value from an action
            // - the non manipulated abort value
            // - one of the above but manipulated through the callback function
            result = runNextMiddleware(call2);
            if (callback) {
                result = callback(result);
            }
        }
        var abortInvoked = false;
        function abort(value) {
            abortInvoked = true;
            // overwrite the result
            // can be manipulated through middlewares earlier in the queue using the callback fn
            result = value;
        }
        handler(call, next, abort);
        if (devMode()) {
            if (!nextInvoked && !abortInvoked) {
                var node2 = getStateTreeNode(call.tree);
                throw fail$1("Neither the next() nor the abort() callback within the middleware " + handler.name + " for the action: \"" + call.name + "\" on the node: " + node2.type.name + " was invoked.");
            }
            else if (nextInvoked && abortInvoked) {
                var node2 = getStateTreeNode(call.tree);
                throw fail$1("The next() and abort() callback within the middleware " + handler.name + " for the action: \"" + call.name + "\" on the node: " + node2.type.name + " were invoked.");
            }
        }
        return result;
    }
    return runNextMiddleware(baseCall);
}

/**
 * Returns the currently executing MST action context, or undefined if none.
 */
function getRunningActionContext() {
    var current = getCurrentActionContext();
    while (current && current.type !== "action") {
        current = current.parentActionEvent;
    }
    return current;
}
function _isActionContextThisOrChildOf(actionContext, sameOrParent, includeSame) {
    var parentId = typeof sameOrParent === "number" ? sameOrParent : sameOrParent.id;
    var current = includeSame
        ? actionContext
        : actionContext.parentActionEvent;
    while (current) {
        if (current.id === parentId) {
            return true;
        }
        current = current.parentActionEvent;
    }
    return false;
}
/**
 * Returns if the given action context is a parent of this action context.
 */
function isActionContextChildOf(actionContext, parent) {
    return _isActionContextThisOrChildOf(actionContext, parent, false);
}
/**
 * Returns if the given action context is this or a parent of this action context.
 */
function isActionContextThisOrChildOf(actionContext, parentOrThis) {
    return _isActionContextThisOrChildOf(actionContext, parentOrThis, true);
}

function safeStringify(value) {
    try {
        return JSON.stringify(value);
    }
    catch (e) {
        // istanbul ignore next
        return "<Unserializable: " + e + ">";
    }
}
/**
 * @internal
 * @hidden
 */
function prettyPrintValue(value) {
    return typeof value === "function"
        ? "<function" + (value.name ? " " + value.name : "") + ">"
        : isStateTreeNode(value)
            ? "<" + value + ">"
            : "`" + safeStringify(value) + "`";
}
function shortenPrintValue(valueInString) {
    return valueInString.length < 280
        ? valueInString
        : valueInString.substring(0, 272) + "......" + valueInString.substring(valueInString.length - 8);
}
function toErrorString(error) {
    var value = error.value;
    var type = error.context[error.context.length - 1].type;
    var fullPath = error.context
        .map(function (_a) {
        var path = _a.path;
        return path;
    })
        .filter(function (path) { return path.length > 0; })
        .join("/");
    var pathPrefix = fullPath.length > 0 ? "at path \"/" + fullPath + "\" " : "";
    var currentTypename = isStateTreeNode(value)
        ? "value of type " + getStateTreeNode(value).type.name + ":"
        : isPrimitive(value)
            ? "value"
            : "snapshot";
    var isSnapshotCompatible = type && isStateTreeNode(value) && type.is(getStateTreeNode(value).snapshot);
    return ("" + pathPrefix + currentTypename + " " + prettyPrintValue(value) + " is not assignable " + (type ? "to type: `" + type.name + "`" : "") +
        (error.message ? " (" + error.message + ")" : "") +
        (type
            ? isPrimitiveType(type) || isPrimitive(value)
                ? "."
                : ", expected an instance of `" + type.name + "` or a snapshot like `" + type.describe() + "` instead." +
                    (isSnapshotCompatible
                        ? " (Note that a snapshot of the provided value is compatible with the targeted type)"
                        : "")
            : "."));
}
/**
 * @internal
 * @hidden
 */
function getContextForPath(context, path, type) {
    return context.concat([{ path: path, type: type }]);
}
/**
 * @internal
 * @hidden
 */
function typeCheckSuccess() {
    return EMPTY_ARRAY;
}
/**
 * @internal
 * @hidden
 */
function typeCheckFailure(context, value, message) {
    return [{ context: context, value: value, message: message }];
}
/**
 * @internal
 * @hidden
 */
function flattenTypeErrors(errors) {
    return errors.reduce(function (a, i) { return a.concat(i); }, []);
}
// TODO; doublecheck: typecheck should only needed to be invoked from: type.create and array / map / value.property will change
/**
 * @internal
 * @hidden
 */
function typecheckInternal(type, value) {
    // runs typeChecking if it is in dev-mode or through a process.env.ENABLE_TYPE_CHECK flag
    if (isTypeCheckingEnabled()) {
        typecheck(type, value);
    }
}
/**
 * Run's the typechecker for the given type on the given value, which can be a snapshot or an instance.
 * Throws if the given value is not according the provided type specification.
 * Use this if you need typechecks even in a production build (by default all automatic runtime type checks will be skipped in production builds)
 *
 * @param type Type to check against.
 * @param value Value to be checked, either a snapshot or an instance.
 */
function typecheck(type, value) {
    var errors = type.validate(value, [{ path: "", type: type }]);
    if (errors.length > 0) {
        throw fail$1(validationErrorsToString(type, value, errors));
    }
}
function validationErrorsToString(type, value, errors) {
    if (errors.length === 0) {
        return undefined;
    }
    return ("Error while converting " + shortenPrintValue(prettyPrintValue(value)) + " to `" + type.name + "`:\n\n    " + errors.map(toErrorString).join("\n    "));
}

var identifierCacheId = 0;
/**
 * @internal
 * @hidden
 */
var IdentifierCache = /** @class */ (function () {
    function IdentifierCache() {
        this.cacheId = identifierCacheId++;
        // n.b. in cache all identifiers are normalized to strings
        this.cache = mobx.observable.map();
        // last time the cache (array) for a given time changed
        // n.b. it is not really the time, but just an integer that gets increased after each modification to the array
        this.lastCacheModificationPerId = mobx.observable.map();
    }
    IdentifierCache.prototype.updateLastCacheModificationPerId = function (identifier) {
        var lcm = this.lastCacheModificationPerId.get(identifier);
        // we start at 1 since 0 means no update since cache creation
        this.lastCacheModificationPerId.set(identifier, lcm === undefined ? 1 : lcm + 1);
    };
    IdentifierCache.prototype.getLastCacheModificationPerId = function (identifier) {
        var modificationId = this.lastCacheModificationPerId.get(identifier) || 0;
        return this.cacheId + "-" + modificationId;
    };
    IdentifierCache.prototype.addNodeToCache = function (node, lastCacheUpdate) {
        if (lastCacheUpdate === void 0) { lastCacheUpdate = true; }
        if (node.identifierAttribute) {
            var identifier = node.identifier;
            if (!this.cache.has(identifier)) {
                this.cache.set(identifier, mobx.observable.array([], mobxShallow));
            }
            var set = this.cache.get(identifier);
            if (set.indexOf(node) !== -1)
                throw fail$1("Already registered");
            set.push(node);
            if (lastCacheUpdate) {
                this.updateLastCacheModificationPerId(identifier);
            }
        }
    };
    IdentifierCache.prototype.mergeCache = function (node) {
        var _this = this;
        mobx.values(node.identifierCache.cache).forEach(function (nodes) {
            return nodes.forEach(function (child) {
                _this.addNodeToCache(child);
            });
        });
    };
    IdentifierCache.prototype.notifyDied = function (node) {
        if (node.identifierAttribute) {
            var id = node.identifier;
            var set = this.cache.get(id);
            if (set) {
                set.remove(node);
                // remove empty sets from cache
                if (!set.length) {
                    this.cache.delete(id);
                }
                this.updateLastCacheModificationPerId(node.identifier);
            }
        }
    };
    IdentifierCache.prototype.splitCache = function (node) {
        var _this = this;
        var res = new IdentifierCache();
        var basePath = node.path;
        mobx.entries(this.cache).forEach(function (_a) {
            var _b = __read(_a, 2), id = _b[0], nodes = _b[1];
            var modified = false;
            for (var i = nodes.length - 1; i >= 0; i--) {
                if (nodes[i].path.indexOf(basePath) === 0) {
                    res.addNodeToCache(nodes[i], false); // no need to update lastUpdated since it is a whole new cache
                    nodes.splice(i, 1);
                    modified = true;
                }
            }
            if (modified) {
                _this.updateLastCacheModificationPerId(id);
            }
        });
        return res;
    };
    IdentifierCache.prototype.has = function (type, identifier) {
        var set = this.cache.get(identifier);
        if (!set)
            return false;
        return set.some(function (candidate) { return type.isAssignableFrom(candidate.type); });
    };
    IdentifierCache.prototype.resolve = function (type, identifier) {
        var set = this.cache.get(identifier);
        if (!set)
            return null;
        var matches = set.filter(function (candidate) { return type.isAssignableFrom(candidate.type); });
        switch (matches.length) {
            case 0:
                return null;
            case 1:
                return matches[0];
            default:
                throw fail$1("Cannot resolve a reference to type '" + type.name + "' with id: '" + identifier + "' unambigously, there are multiple candidates: " + matches
                    .map(function (n) { return n.path; })
                    .join(", "));
        }
    };
    return IdentifierCache;
}());

/**
 * @internal
 * @hidden
 */
function createObjectNode(type, parent, subpath, environment, initialValue) {
    var existingNode = getStateTreeNodeSafe(initialValue);
    if (existingNode) {
        if (existingNode.parent) {
            // istanbul ignore next
            throw fail$1("Cannot add an object to a state tree if it is already part of the same or another state tree. Tried to assign an object to '" + (parent ? parent.path : "") + "/" + subpath + "', but it lives already at '" + existingNode.path + "'");
        }
        if (parent) {
            existingNode.setParent(parent, subpath);
        }
        // else it already has no parent since it is a pre-requisite
        return existingNode;
    }
    // not a node, a snapshot
    return new ObjectNode(type, parent, subpath, environment, initialValue);
}
/**
 * @internal
 * @hidden
 */
function createScalarNode(type, parent, subpath, environment, initialValue) {
    return new ScalarNode(type, parent, subpath, environment, initialValue);
}
/**
 * @internal
 * @hidden
 */
function isNode(value) {
    return value instanceof ScalarNode || value instanceof ObjectNode;
}

/**
 * @internal
 * @hidden
 */
var NodeLifeCycle;
(function (NodeLifeCycle) {
    NodeLifeCycle[NodeLifeCycle["INITIALIZING"] = 0] = "INITIALIZING";
    NodeLifeCycle[NodeLifeCycle["CREATED"] = 1] = "CREATED";
    NodeLifeCycle[NodeLifeCycle["FINALIZED"] = 2] = "FINALIZED";
    NodeLifeCycle[NodeLifeCycle["DETACHING"] = 3] = "DETACHING";
    NodeLifeCycle[NodeLifeCycle["DEAD"] = 4] = "DEAD"; // no coming back from this one
})(NodeLifeCycle || (NodeLifeCycle = {}));
/**
 * Returns true if the given value is a node in a state tree.
 * More precisely, that is, if the value is an instance of a
 * `types.model`, `types.array` or `types.map`.
 *
 * @param value
 * @returns true if the value is a state tree node.
 */
function isStateTreeNode(value) {
    return !!(value && value.$treenode);
}
/**
 * @internal
 * @hidden
 */
function assertIsStateTreeNode(value, argNumber) {
    assertArg(value, isStateTreeNode, "mobx-state-tree node", argNumber);
}
/**
 * @internal
 * @hidden
 */
function getStateTreeNode(value) {
    if (!isStateTreeNode(value)) {
        // istanbul ignore next
        throw fail$1("Value " + value + " is no MST Node");
    }
    return value.$treenode;
}
/**
 * @internal
 * @hidden
 */
function getStateTreeNodeSafe(value) {
    return (value && value.$treenode) || null;
}
/**
 * @internal
 * @hidden
 */
function toJSON() {
    return getStateTreeNode(this).snapshot;
}
var doubleDot = function (_) { return ".."; };
/**
 * @internal
 * @hidden
 */
function getRelativePathBetweenNodes(base, target) {
    // PRE condition target is (a child of) base!
    if (base.root !== target.root) {
        throw fail$1("Cannot calculate relative path: objects '" + base + "' and '" + target + "' are not part of the same object tree");
    }
    var baseParts = splitJsonPath(base.path);
    var targetParts = splitJsonPath(target.path);
    var common = 0;
    for (; common < baseParts.length; common++) {
        if (baseParts[common] !== targetParts[common])
            break;
    }
    // TODO: assert that no targetParts paths are "..", "." or ""!
    return (baseParts
        .slice(common)
        .map(doubleDot)
        .join("/") + joinJsonPath(targetParts.slice(common)));
}
/**
 * @internal
 * @hidden
 */
function resolveNodeByPath(base, path, failIfResolveFails) {
    if (failIfResolveFails === void 0) { failIfResolveFails = true; }
    return resolveNodeByPathParts(base, splitJsonPath(path), failIfResolveFails);
}
/**
 * @internal
 * @hidden
 */
function resolveNodeByPathParts(base, pathParts, failIfResolveFails) {
    if (failIfResolveFails === void 0) { failIfResolveFails = true; }
    var current = base;
    for (var i = 0; i < pathParts.length; i++) {
        var part = pathParts[i];
        if (part === "..") {
            current = current.parent;
            if (current)
                continue; // not everything has a parent
        }
        else if (part === ".") {
            continue;
        }
        else if (current) {
            if (current instanceof ScalarNode) {
                // check if the value of a scalar resolves to a state tree node (e.g. references)
                // then we can continue resolving...
                try {
                    var value = current.value;
                    if (isStateTreeNode(value)) {
                        current = getStateTreeNode(value);
                        // fall through
                    }
                }
                catch (e) {
                    if (!failIfResolveFails) {
                        return undefined;
                    }
                    throw e;
                }
            }
            if (current instanceof ObjectNode) {
                var subType = current.getChildType(part);
                if (subType) {
                    current = current.getChildNode(part);
                    if (current)
                        continue;
                }
            }
        }
        if (failIfResolveFails)
            throw fail$1("Could not resolve '" + part + "' in path '" + (joinJsonPath(pathParts.slice(0, i)) ||
                "/") + "' while resolving '" + joinJsonPath(pathParts) + "'");
        else
            return undefined;
    }
    return current;
}
/**
 * @internal
 * @hidden
 */
function convertChildNodesToArray(childNodes) {
    if (!childNodes)
        return EMPTY_ARRAY;
    var keys = Object.keys(childNodes);
    if (!keys.length)
        return EMPTY_ARRAY;
    var result = new Array(keys.length);
    keys.forEach(function (key, index) {
        result[index] = childNodes[key];
    });
    return result;
}

// based on: https://github.com/mobxjs/mobx-utils/blob/master/src/async-action.ts
/*
    All contents of this file are deprecated.

    The term `process` has been replaced with `flow` to avoid conflicts with the
    global `process` object.

    Refer to `flow.ts` for any further changes to this implementation.
*/
var DEPRECATION_MESSAGE = "See https://github.com/mobxjs/mobx-state-tree/issues/399 for more information. " +
    "Note that the middleware event types starting with `process` now start with `flow`.";
/**
 * @hidden
 *
 * @deprecated has been renamed to `flow()`.
 * See https://github.com/mobxjs/mobx-state-tree/issues/399 for more information.
 * Note that the middleware event types starting with `process` now start with `flow`.
 *
 * @returns {Promise}
 */
function process$1(asyncAction) {
    deprecated("process", "`process()` has been renamed to `flow()`. " + DEPRECATION_MESSAGE);
    return flow(asyncAction);
}

/**
 * @internal
 * @hidden
 */
var EMPTY_ARRAY = Object.freeze([]);
/**
 * @internal
 * @hidden
 */
var EMPTY_OBJECT = Object.freeze({});
/**
 * @internal
 * @hidden
 */
var mobxShallow = typeof mobx.$mobx === "string" ? { deep: false } : { deep: false, proxy: false };
Object.freeze(mobxShallow);
/**
 * @internal
 * @hidden
 */
function fail$1(message) {
    if (message === void 0) { message = "Illegal state"; }
    return new Error("[mobx-state-tree] " + message);
}
/**
 * @internal
 * @hidden
 */
function identity(_) {
    return _;
}
/**
 * pollyfill (for IE) suggested in MDN:
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger
 * @internal
 * @hidden
 */
var isInteger = Number.isInteger ||
    function (value) {
        return typeof value === "number" && isFinite(value) && Math.floor(value) === value;
    };
/**
 * @internal
 * @hidden
 */
function isArray(val) {
    return Array.isArray(val) || mobx.isObservableArray(val);
}
/**
 * @internal
 * @hidden
 */
function asArray(val) {
    if (!val)
        return EMPTY_ARRAY;
    if (isArray(val))
        return val;
    return [val];
}
/**
 * @internal
 * @hidden
 */
function extend(a) {
    var b = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        b[_i - 1] = arguments[_i];
    }
    for (var i = 0; i < b.length; i++) {
        var current = b[i];
        for (var key in current)
            a[key] = current[key];
    }
    return a;
}
/**
 * @internal
 * @hidden
 */
function isPlainObject(value) {
    if (value === null || typeof value !== "object")
        return false;
    var proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}
/**
 * @internal
 * @hidden
 */
function isMutable(value) {
    return (value !== null &&
        typeof value === "object" &&
        !(value instanceof Date) &&
        !(value instanceof RegExp));
}
/**
 * @internal
 * @hidden
 */
function isPrimitive(value, includeDate) {
    if (includeDate === void 0) { includeDate = true; }
    if (value === null || value === undefined)
        return true;
    if (typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        (includeDate && value instanceof Date))
        return true;
    return false;
}
/**
 * @internal
 * @hidden
 * Freeze a value and return it (if not in production)
 */
function freeze(value) {
    if (!devMode())
        return value;
    return isPrimitive(value) || mobx.isObservableArray(value) ? value : Object.freeze(value);
}
/**
 * @internal
 * @hidden
 * Recursively freeze a value (if not in production)
 */
function deepFreeze(value) {
    if (!devMode())
        return value;
    freeze(value);
    if (isPlainObject(value)) {
        Object.keys(value).forEach(function (propKey) {
            if (!isPrimitive(value[propKey]) &&
                !Object.isFrozen(value[propKey])) {
                deepFreeze(value[propKey]);
            }
        });
    }
    return value;
}
/**
 * @internal
 * @hidden
 */
function isSerializable(value) {
    return typeof value !== "function";
}
/**
 * @internal
 * @hidden
 */
function addHiddenFinalProp(object, propName, value) {
    Object.defineProperty(object, propName, {
        enumerable: false,
        writable: false,
        configurable: true,
        value: value
    });
}
/**
 * @internal
 * @hidden
 */
function addHiddenWritableProp(object, propName, value) {
    Object.defineProperty(object, propName, {
        enumerable: false,
        writable: true,
        configurable: true,
        value: value
    });
}
/**
 * @internal
 * @hidden
 */
var EventHandler = /** @class */ (function () {
    function EventHandler() {
        this.handlers = [];
    }
    Object.defineProperty(EventHandler.prototype, "hasSubscribers", {
        get: function () {
            return this.handlers.length > 0;
        },
        enumerable: true,
        configurable: true
    });
    EventHandler.prototype.register = function (fn, atTheBeginning) {
        var _this = this;
        if (atTheBeginning === void 0) { atTheBeginning = false; }
        if (atTheBeginning) {
            this.handlers.unshift(fn);
        }
        else {
            this.handlers.push(fn);
        }
        return function () {
            _this.unregister(fn);
        };
    };
    EventHandler.prototype.has = function (fn) {
        return this.handlers.indexOf(fn) >= 0;
    };
    EventHandler.prototype.unregister = function (fn) {
        var index = this.handlers.indexOf(fn);
        if (index >= 0) {
            this.handlers.splice(index, 1);
        }
    };
    EventHandler.prototype.clear = function () {
        this.handlers.length = 0;
    };
    EventHandler.prototype.emit = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        // make a copy just in case it changes
        var handlers = this.handlers.slice();
        handlers.forEach(function (f) { return f.apply(void 0, __spread(args)); });
    };
    return EventHandler;
}());
/**
 * @internal
 * @hidden
 */
var EventHandlers = /** @class */ (function () {
    function EventHandlers() {
    }
    EventHandlers.prototype.hasSubscribers = function (event) {
        var handler = this.eventHandlers && this.eventHandlers[event];
        return !!handler && handler.hasSubscribers;
    };
    EventHandlers.prototype.register = function (event, fn, atTheBeginning) {
        if (atTheBeginning === void 0) { atTheBeginning = false; }
        if (!this.eventHandlers) {
            this.eventHandlers = {};
        }
        var handler = this.eventHandlers[event];
        if (!handler) {
            handler = this.eventHandlers[event] = new EventHandler();
        }
        return handler.register(fn, atTheBeginning);
    };
    EventHandlers.prototype.has = function (event, fn) {
        var handler = this.eventHandlers && this.eventHandlers[event];
        return !!handler && handler.has(fn);
    };
    EventHandlers.prototype.unregister = function (event, fn) {
        var handler = this.eventHandlers && this.eventHandlers[event];
        if (handler) {
            handler.unregister(fn);
        }
    };
    EventHandlers.prototype.clear = function (event) {
        if (this.eventHandlers) {
            delete this.eventHandlers[event];
        }
    };
    EventHandlers.prototype.clearAll = function () {
        this.eventHandlers = undefined;
    };
    EventHandlers.prototype.emit = function (event) {
        var _a;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var handler = this.eventHandlers && this.eventHandlers[event];
        if (handler) {
            (_a = handler).emit.apply(_a, __spread(args));
        }
    };
    return EventHandlers;
}());
/**
 * @internal
 * @hidden
 */
function argsToArray(args) {
    var res = new Array(args.length);
    for (var i = 0; i < args.length; i++)
        res[i] = args[i];
    return res;
}
/**
 * @internal
 * @hidden
 */
function invalidateComputed(target, propName) {
    var atom = mobx.getAtom(target, propName);
    atom.trackAndCompute();
}
/**
 * @internal
 * @hidden
 */
function stringStartsWith(str, beginning) {
    return str.indexOf(beginning) === 0;
}
/**
 * @internal
 * @hidden
 */
var deprecated = function (id, message) {
    // skip if running production
    if (!devMode())
        return;
    // warn if hasn't been warned before
    if (deprecated.ids && !deprecated.ids.hasOwnProperty(id)) {
        warnError("Deprecation warning: " + message);
    }
    // mark as warned to avoid duplicate warn message
    if (deprecated.ids)
        deprecated.ids[id] = true;
};
deprecated.ids = {};
/**
 * @internal
 * @hidden
 */
function warnError(msg) {
    console.warn(new Error("[mobx-state-tree] " + msg));
}
/**
 * @internal
 * @hidden
 */
function isTypeCheckingEnabled() {
    return (devMode() ||
        (typeof process !== "undefined" && process.env && process.env.ENABLE_TYPE_CHECK === "true"));
}
/**
 * @internal
 * @hidden
 */
function devMode() {
    return process.env.NODE_ENV !== "production";
}
/**
 * @internal
 * @hidden
 */
function assertArg(value, fn, typeName, argNumber) {
    if (devMode()) {
        if (!fn(value)) {
            // istanbul ignore next
            throw fail$1("expected " + typeName + " as argument " + asArray(argNumber).join(" or ") + ", got " + value + " instead");
        }
    }
}
/**
 * @internal
 * @hidden
 */
function assertIsFunction(value, argNumber) {
    assertArg(value, function (fn) { return typeof fn === "function"; }, "function", argNumber);
}
/**
 * @internal
 * @hidden
 */
function assertIsNumber(value, argNumber, min, max) {
    assertArg(value, function (n) { return typeof n === "number"; }, "number", argNumber);
    if (min !== undefined) {
        assertArg(value, function (n) { return n >= min; }, "number greater than " + min, argNumber);
    }
    if (max !== undefined) {
        assertArg(value, function (n) { return n <= max; }, "number lesser than " + max, argNumber);
    }
}
/**
 * @internal
 * @hidden
 */
function assertIsString(value, argNumber, canBeEmpty) {
    if (canBeEmpty === void 0) { canBeEmpty = true; }
    assertArg(value, function (s) { return typeof s === "string"; }, "string", argNumber);
    if (!canBeEmpty) {
        assertArg(value, function (s) { return s !== ""; }, "not empty string", argNumber);
    }
}
/**
 * @internal
 * @hidden
 */
function setImmediateWithFallback(fn) {
    if (typeof queueMicrotask === "function") {
        queueMicrotask(fn);
    }
    else if (typeof setImmediate === "function") {
        setImmediate(fn);
    }
    else {
        setTimeout(fn, 1);
    }
}

/**
 * See [asynchronous actions](concepts/async-actions.md).
 *
 * @returns The flow as a promise.
 */
function flow(generator) {
    return createFlowSpawner(generator.name, generator);
}
/**
 * @deprecated Not needed since TS3.6.
 * Used for TypeScript to make flows that return a promise return the actual promise result.
 *
 * @param val
 * @returns
 */
function castFlowReturn(val) {
    return val;
}
/**
 * @internal
 * @hidden
 */
function createFlowSpawner(name, generator) {
    var spawner = function flowSpawner() {
        // Implementation based on https://github.com/tj/co/blob/master/index.js
        var runId = getNextActionId();
        var parentContext = getCurrentActionContext();
        if (!parentContext) {
            throw fail$1("a mst flow must always have a parent context");
        }
        var parentActionContext = getParentActionContext(parentContext);
        if (!parentActionContext) {
            throw fail$1("a mst flow must always have a parent action context");
        }
        var contextBase = {
            name: name,
            id: runId,
            tree: parentContext.tree,
            context: parentContext.context,
            parentId: parentContext.id,
            allParentIds: __spread(parentContext.allParentIds, [parentContext.id]),
            rootId: parentContext.rootId,
            parentEvent: parentContext,
            parentActionEvent: parentActionContext
        };
        var args = arguments;
        function wrap(fn, type, arg) {
            fn.$mst_middleware = spawner.$mst_middleware; // pick up any middleware attached to the flow
            runWithActionContext(__assign(__assign({}, contextBase), { type: type, args: [arg] }), fn);
        }
        return new Promise(function (resolve, reject) {
            var gen;
            var init = function asyncActionInit() {
                gen = generator.apply(null, arguments);
                onFulfilled(undefined); // kick off the flow
            };
            init.$mst_middleware = spawner.$mst_middleware;
            runWithActionContext(__assign(__assign({}, contextBase), { type: "flow_spawn", args: argsToArray(args) }), init);
            function onFulfilled(res) {
                var ret;
                try {
                    // prettier-ignore
                    wrap(function (r) { ret = gen.next(r); }, "flow_resume", res);
                }
                catch (e) {
                    // prettier-ignore
                    setImmediateWithFallback(function () {
                        wrap(function (r) { reject(e); }, "flow_throw", e);
                    });
                    return;
                }
                next(ret);
                return;
            }
            function onRejected(err) {
                var ret;
                try {
                    // prettier-ignore
                    wrap(function (r) { ret = gen.throw(r); }, "flow_resume_error", err); // or yieldError?
                }
                catch (e) {
                    // prettier-ignore
                    setImmediateWithFallback(function () {
                        wrap(function (r) { reject(e); }, "flow_throw", e);
                    });
                    return;
                }
                next(ret);
            }
            function next(ret) {
                if (ret.done) {
                    // prettier-ignore
                    setImmediateWithFallback(function () {
                        wrap(function (r) { resolve(r); }, "flow_return", ret.value);
                    });
                    return;
                }
                // TODO: support more type of values? See https://github.com/tj/co/blob/249bbdc72da24ae44076afd716349d2089b31c4c/index.js#L100
                if (!ret.value || typeof ret.value.then !== "function") {
                    // istanbul ignore next
                    throw fail$1("Only promises can be yielded to `async`, got: " + ret);
                }
                return ret.value.then(onFulfilled, onRejected);
            }
        });
    };
    return spawner;
}

/**
 * @internal
 * @hidden
 */
function splitPatch(patch) {
    if (!("oldValue" in patch))
        throw fail$1("Patches without `oldValue` field cannot be inversed");
    return [stripPatch(patch), invertPatch(patch)];
}
/**
 * @internal
 * @hidden
 */
function stripPatch(patch) {
    // strips `oldvalue` information from the patch, so that it becomes a patch conform the json-patch spec
    // this removes the ability to undo the patch
    switch (patch.op) {
        case "add":
            return { op: "add", path: patch.path, value: patch.value };
        case "remove":
            return { op: "remove", path: patch.path };
        case "replace":
            return { op: "replace", path: patch.path, value: patch.value };
    }
}
function invertPatch(patch) {
    switch (patch.op) {
        case "add":
            return {
                op: "remove",
                path: patch.path
            };
        case "remove":
            return {
                op: "add",
                path: patch.path,
                value: patch.oldValue
            };
        case "replace":
            return {
                op: "replace",
                path: patch.path,
                value: patch.oldValue
            };
    }
}
/**
 * Simple simple check to check it is a number.
 */
function isNumber(x) {
    return typeof x === "number";
}
/**
 * Escape slashes and backslashes.
 *
 * http://tools.ietf.org/html/rfc6901
 */
function escapeJsonPath(path) {
    if (isNumber(path) === true) {
        return "" + path;
    }
    if (path.indexOf("/") === -1 && path.indexOf("~") === -1)
        return path;
    return path.replace(/~/g, "~0").replace(/\//g, "~1");
}
/**
 * Unescape slashes and backslashes.
 */
function unescapeJsonPath(path) {
    return path.replace(/~1/g, "/").replace(/~0/g, "~");
}
/**
 * Generates a json-path compliant json path from path parts.
 *
 * @param path
 * @returns
 */
function joinJsonPath(path) {
    // `/` refers to property with an empty name, while `` refers to root itself!
    if (path.length === 0)
        return "";
    var getPathStr = function (p) { return p.map(escapeJsonPath).join("/"); };
    if (path[0] === "." || path[0] === "..") {
        // relative
        return getPathStr(path);
    }
    else {
        // absolute
        return "/" + getPathStr(path);
    }
}
/**
 * Splits and decodes a json path into several parts.
 *
 * @param path
 * @returns
 */
function splitJsonPath(path) {
    // `/` refers to property with an empty name, while `` refers to root itself!
    var parts = path.split("/").map(unescapeJsonPath);
    var valid = path === "" ||
        path === "." ||
        path === ".." ||
        stringStartsWith(path, "/") ||
        stringStartsWith(path, "./") ||
        stringStartsWith(path, "../");
    if (!valid) {
        throw fail$1("a json path must be either rooted, empty or relative, but got '" + path + "'");
    }
    // '/a/b/c' -> ["a", "b", "c"]
    // '../../b/c' -> ["..", "..", "b", "c"]
    // '' -> []
    // '/' -> ['']
    // './a' -> [".", "a"]
    // /./a' -> [".", "a"] equivalent to './a'
    if (parts[0] === "") {
        parts.shift();
    }
    return parts;
}

var SnapshotProcessor = /** @class */ (function (_super) {
    __extends(SnapshotProcessor, _super);
    function SnapshotProcessor(_subtype, _processors, name) {
        var _this = _super.call(this, name || _subtype.name) || this;
        _this._subtype = _subtype;
        _this._processors = _processors;
        return _this;
    }
    Object.defineProperty(SnapshotProcessor.prototype, "flags", {
        get: function () {
            return this._subtype.flags | TypeFlags.SnapshotProcessor;
        },
        enumerable: true,
        configurable: true
    });
    SnapshotProcessor.prototype.describe = function () {
        return "snapshotProcessor(" + this._subtype.describe() + ")";
    };
    SnapshotProcessor.prototype.preProcessSnapshot = function (sn) {
        if (this._processors.preProcessor) {
            return this._processors.preProcessor.call(null, sn);
        }
        return sn;
    };
    SnapshotProcessor.prototype.postProcessSnapshot = function (sn) {
        if (this._processors.postProcessor) {
            return this._processors.postProcessor.call(null, sn);
        }
        return sn;
    };
    SnapshotProcessor.prototype._fixNode = function (node) {
        var _this = this;
        // the node has to use these methods rather than the original type ones
        proxyNodeTypeMethods(node.type, this, "isAssignableFrom", "create");
        var oldGetSnapshot = node.getSnapshot;
        node.getSnapshot = function () {
            return _this.postProcessSnapshot(oldGetSnapshot.call(node));
        };
    };
    SnapshotProcessor.prototype.instantiate = function (parent, subpath, environment, initialValue) {
        var processedInitialValue = isStateTreeNode(initialValue)
            ? initialValue
            : this.preProcessSnapshot(initialValue);
        var node = this._subtype.instantiate(parent, subpath, environment, processedInitialValue);
        this._fixNode(node);
        return node;
    };
    SnapshotProcessor.prototype.reconcile = function (current, newValue, parent, subpath) {
        var node = this._subtype.reconcile(current, isStateTreeNode(newValue) ? newValue : this.preProcessSnapshot(newValue), parent, subpath);
        if (node !== current) {
            this._fixNode(node);
        }
        return node;
    };
    SnapshotProcessor.prototype.getSnapshot = function (node, applyPostProcess) {
        if (applyPostProcess === void 0) { applyPostProcess = true; }
        var sn = this._subtype.getSnapshot(node);
        return applyPostProcess ? this.postProcessSnapshot(sn) : sn;
    };
    SnapshotProcessor.prototype.isValidSnapshot = function (value, context) {
        var processedSn = this.preProcessSnapshot(value);
        return this._subtype.validate(processedSn, context);
    };
    SnapshotProcessor.prototype.getSubTypes = function () {
        return this._subtype;
    };
    SnapshotProcessor.prototype.is = function (thing) {
        var value = isType(thing)
            ? this._subtype
            : isStateTreeNode(thing)
                ? getSnapshot(thing, false)
                : this.preProcessSnapshot(thing);
        return this._subtype.validate(value, [{ path: "", type: this._subtype }]).length === 0;
    };
    return SnapshotProcessor;
}(BaseType));
function proxyNodeTypeMethods(nodeType, snapshotProcessorType) {
    var e_1, _a;
    var methods = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        methods[_i - 2] = arguments[_i];
    }
    try {
        for (var methods_1 = __values(methods), methods_1_1 = methods_1.next(); !methods_1_1.done; methods_1_1 = methods_1.next()) {
            var method = methods_1_1.value;
            nodeType[method] = snapshotProcessorType[method].bind(snapshotProcessorType);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (methods_1_1 && !methods_1_1.done && (_a = methods_1.return)) _a.call(methods_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
}
/**
 * `types.snapshotProcessor` - Runs a pre/post snapshot processor before/after serializing a given type.
 *
 * Example:
 * ```ts
 * const Todo1 = types.model({ text: types.string })
 * // in the backend the text type must be null when empty
 * interface BackendTodo {
 *     text: string | null
 * }
 * const Todo2 = types.snapshotProcessor(Todo1, {
 *     // from snapshot to instance
 *     preProcessor(sn: BackendTodo) {
 *         return {
 *             text: sn.text || "";
 *         }
 *     },
 *     // from instance to snapshot
 *     postProcessor(sn): BackendTodo {
 *         return {
 *             text: !sn.text ? null : sn.text
 *         }
 *     }
 * })
 * ```
 *
 * @param type Type to run the processors over.
 * @param processors Processors to run.
 * @param name Type name, or undefined to inherit the inner type one.
 * @returns
 */
function snapshotProcessor(type, processors, name) {
    assertIsType(type, 1);
    if (devMode()) {
        if (processors.postProcessor && typeof processors.postProcessor !== "function") {
            // istanbul ignore next
            throw fail("postSnapshotProcessor must be a function");
        }
        if (processors.preProcessor && typeof processors.preProcessor !== "function") {
            // istanbul ignore next
            throw fail("preSnapshotProcessor must be a function");
        }
    }
    return new SnapshotProcessor(type, processors, name);
}

var needsIdentifierError = "Map.put can only be used to store complex values that have an identifier type attribute";
function tryCollectModelTypes(type, modelTypes) {
    var e_1, _a;
    var subtypes = type.getSubTypes();
    if (subtypes === cannotDetermineSubtype) {
        return false;
    }
    if (subtypes) {
        var subtypesArray = asArray(subtypes);
        try {
            for (var subtypesArray_1 = __values(subtypesArray), subtypesArray_1_1 = subtypesArray_1.next(); !subtypesArray_1_1.done; subtypesArray_1_1 = subtypesArray_1.next()) {
                var subtype = subtypesArray_1_1.value;
                if (!tryCollectModelTypes(subtype, modelTypes))
                    return false;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (subtypesArray_1_1 && !subtypesArray_1_1.done && (_a = subtypesArray_1.return)) _a.call(subtypesArray_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    if (type instanceof ModelType) {
        modelTypes.push(type);
    }
    return true;
}
/**
 * @internal
 * @hidden
 */
var MapIdentifierMode;
(function (MapIdentifierMode) {
    MapIdentifierMode[MapIdentifierMode["UNKNOWN"] = 0] = "UNKNOWN";
    MapIdentifierMode[MapIdentifierMode["YES"] = 1] = "YES";
    MapIdentifierMode[MapIdentifierMode["NO"] = 2] = "NO";
})(MapIdentifierMode || (MapIdentifierMode = {}));
var MSTMap = /** @class */ (function (_super) {
    __extends(MSTMap, _super);
    function MSTMap(initialData) {
        return _super.call(this, initialData, mobx.observable.ref.enhancer) || this;
    }
    MSTMap.prototype.get = function (key) {
        // maybe this is over-enthousiastic? normalize numeric keys to strings
        return _super.prototype.get.call(this, "" + key);
    };
    MSTMap.prototype.has = function (key) {
        return _super.prototype.has.call(this, "" + key);
    };
    MSTMap.prototype.delete = function (key) {
        return _super.prototype.delete.call(this, "" + key);
    };
    MSTMap.prototype.set = function (key, value) {
        return _super.prototype.set.call(this, "" + key, value);
    };
    MSTMap.prototype.put = function (value) {
        if (!value)
            throw fail$1("Map.put cannot be used to set empty values");
        if (isStateTreeNode(value)) {
            var node = getStateTreeNode(value);
            if (devMode()) {
                if (!node.identifierAttribute) {
                    throw fail$1(needsIdentifierError);
                }
            }
            if (node.identifier === null) {
                throw fail$1(needsIdentifierError);
            }
            this.set(node.identifier, value);
            return value;
        }
        else if (!isMutable(value)) {
            throw fail$1("Map.put can only be used to store complex values");
        }
        else {
            var mapNode = getStateTreeNode(this);
            var mapType = mapNode.type;
            if (mapType.identifierMode !== MapIdentifierMode.YES) {
                throw fail$1(needsIdentifierError);
            }
            var idAttr = mapType.mapIdentifierAttribute;
            var id = value[idAttr];
            if (!isValidIdentifier(id)) {
                // try again but this time after creating a node for the value
                // since it might be an optional identifier
                var newNode = this.put(mapType.getChildType().create(value, mapNode.environment));
                return this.put(getSnapshot(newNode));
            }
            var key = normalizeIdentifier(id);
            this.set(key, value);
            return this.get(key);
        }
    };
    return MSTMap;
}(mobx.ObservableMap));
/**
 * @internal
 * @hidden
 */
var MapType = /** @class */ (function (_super) {
    __extends(MapType, _super);
    function MapType(name, _subType, hookInitializers) {
        if (hookInitializers === void 0) { hookInitializers = []; }
        var _this = _super.call(this, name) || this;
        _this._subType = _subType;
        _this.identifierMode = MapIdentifierMode.UNKNOWN;
        _this.mapIdentifierAttribute = undefined;
        _this.flags = TypeFlags.Map;
        _this.hookInitializers = [];
        _this._determineIdentifierMode();
        _this.hookInitializers = hookInitializers;
        return _this;
    }
    MapType.prototype.hooks = function (hooks) {
        var hookInitializers = this.hookInitializers.length > 0 ? this.hookInitializers.concat(hooks) : [hooks];
        return new MapType(this.name, this._subType, hookInitializers);
    };
    MapType.prototype.instantiate = function (parent, subpath, environment, initialValue) {
        this._determineIdentifierMode();
        return createObjectNode(this, parent, subpath, environment, initialValue);
    };
    MapType.prototype._determineIdentifierMode = function () {
        if (this.identifierMode !== MapIdentifierMode.UNKNOWN) {
            return;
        }
        var modelTypes = [];
        if (tryCollectModelTypes(this._subType, modelTypes)) {
            var identifierAttribute_1 = undefined;
            modelTypes.forEach(function (type) {
                if (type.identifierAttribute) {
                    if (identifierAttribute_1 && identifierAttribute_1 !== type.identifierAttribute) {
                        throw fail$1("The objects in a map should all have the same identifier attribute, expected '" + identifierAttribute_1 + "', but child of type '" + type.name + "' declared attribute '" + type.identifierAttribute + "' as identifier");
                    }
                    identifierAttribute_1 = type.identifierAttribute;
                }
            });
            if (identifierAttribute_1) {
                this.identifierMode = MapIdentifierMode.YES;
                this.mapIdentifierAttribute = identifierAttribute_1;
            }
            else {
                this.identifierMode = MapIdentifierMode.NO;
            }
        }
    };
    MapType.prototype.initializeChildNodes = function (objNode, initialSnapshot) {
        if (initialSnapshot === void 0) { initialSnapshot = {}; }
        var subType = objNode.type._subType;
        var result = {};
        Object.keys(initialSnapshot).forEach(function (name) {
            result[name] = subType.instantiate(objNode, name, undefined, initialSnapshot[name]);
        });
        return result;
    };
    MapType.prototype.createNewInstance = function (childNodes) {
        return new MSTMap(childNodes);
    };
    MapType.prototype.finalizeNewInstance = function (node, instance) {
        mobx._interceptReads(instance, node.unbox);
        var type = node.type;
        type.hookInitializers.forEach(function (initializer) {
            var hooks = initializer(instance);
            Object.keys(hooks).forEach(function (name) {
                var hook = hooks[name];
                var actionInvoker = createActionInvoker(instance, name, hook);
                (!devMode() ? addHiddenFinalProp : addHiddenWritableProp)(instance, name, actionInvoker);
            });
        });
        mobx.intercept(instance, this.willChange);
        mobx.observe(instance, this.didChange);
    };
    MapType.prototype.describe = function () {
        return "Map<string, " + this._subType.describe() + ">";
    };
    MapType.prototype.getChildren = function (node) {
        // return (node.storedValue as ObservableMap<any>).values()
        return mobx.values(node.storedValue);
    };
    MapType.prototype.getChildNode = function (node, key) {
        var childNode = node.storedValue.get("" + key);
        if (!childNode)
            throw fail$1("Not a child " + key);
        return childNode;
    };
    MapType.prototype.willChange = function (change) {
        var node = getStateTreeNode(change.object);
        var key = change.name;
        node.assertWritable({ subpath: key });
        var mapType = node.type;
        var subType = mapType._subType;
        switch (change.type) {
            case "update":
                {
                    var newValue = change.newValue;
                    var oldValue = change.object.get(key);
                    if (newValue === oldValue)
                        return null;
                    typecheckInternal(subType, newValue);
                    change.newValue = subType.reconcile(node.getChildNode(key), change.newValue, node, key);
                    mapType.processIdentifier(key, change.newValue);
                }
                break;
            case "add":
                {
                    typecheckInternal(subType, change.newValue);
                    change.newValue = subType.instantiate(node, key, undefined, change.newValue);
                    mapType.processIdentifier(key, change.newValue);
                }
                break;
        }
        return change;
    };
    MapType.prototype.processIdentifier = function (expected, node) {
        if (this.identifierMode === MapIdentifierMode.YES && node instanceof ObjectNode) {
            var identifier = node.identifier;
            if (identifier !== expected)
                throw fail$1("A map of objects containing an identifier should always store the object under their own identifier. Trying to store key '" + identifier + "', but expected: '" + expected + "'");
        }
    };
    MapType.prototype.getSnapshot = function (node) {
        var res = {};
        node.getChildren().forEach(function (childNode) {
            res[childNode.subpath] = childNode.snapshot;
        });
        return res;
    };
    MapType.prototype.processInitialSnapshot = function (childNodes) {
        var processed = {};
        Object.keys(childNodes).forEach(function (key) {
            processed[key] = childNodes[key].getSnapshot();
        });
        return processed;
    };
    MapType.prototype.didChange = function (change) {
        var node = getStateTreeNode(change.object);
        switch (change.type) {
            case "update":
                return void node.emitPatch({
                    op: "replace",
                    path: escapeJsonPath(change.name),
                    value: change.newValue.snapshot,
                    oldValue: change.oldValue ? change.oldValue.snapshot : undefined
                }, node);
            case "add":
                return void node.emitPatch({
                    op: "add",
                    path: escapeJsonPath(change.name),
                    value: change.newValue.snapshot,
                    oldValue: undefined
                }, node);
            case "delete":
                // a node got deleted, get the old snapshot and make the node die
                var oldSnapshot = change.oldValue.snapshot;
                change.oldValue.die();
                // emit the patch
                return void node.emitPatch({
                    op: "remove",
                    path: escapeJsonPath(change.name),
                    oldValue: oldSnapshot
                }, node);
        }
    };
    MapType.prototype.applyPatchLocally = function (node, subpath, patch) {
        var target = node.storedValue;
        switch (patch.op) {
            case "add":
            case "replace":
                target.set(subpath, patch.value);
                break;
            case "remove":
                target.delete(subpath);
                break;
        }
    };
    MapType.prototype.applySnapshot = function (node, snapshot) {
        typecheckInternal(this, snapshot);
        var target = node.storedValue;
        var currentKeys = {};
        Array.from(target.keys()).forEach(function (key) {
            currentKeys[key] = false;
        });
        if (snapshot) {
            // Don't use target.replace, as it will throw away all existing items first
            for (var key in snapshot) {
                target.set(key, snapshot[key]);
                currentKeys["" + key] = true;
            }
        }
        Object.keys(currentKeys).forEach(function (key) {
            if (currentKeys[key] === false)
                target.delete(key);
        });
    };
    MapType.prototype.getChildType = function () {
        return this._subType;
    };
    MapType.prototype.isValidSnapshot = function (value, context) {
        var _this = this;
        if (!isPlainObject(value)) {
            return typeCheckFailure(context, value, "Value is not a plain object");
        }
        return flattenTypeErrors(Object.keys(value).map(function (path) {
            return _this._subType.validate(value[path], getContextForPath(context, path, _this._subType));
        }));
    };
    MapType.prototype.getDefaultSnapshot = function () {
        return EMPTY_OBJECT;
    };
    MapType.prototype.removeChild = function (node, subpath) {
        node.storedValue.delete(subpath);
    };
    __decorate([
        mobx.action
    ], MapType.prototype, "applySnapshot", null);
    return MapType;
}(ComplexType));
/**
 * `types.map` - Creates a key based collection type who's children are all of a uniform declared type.
 * If the type stored in a map has an identifier, it is mandatory to store the child under that identifier in the map.
 *
 * This type will always produce [observable maps](https://mobx.js.org/refguide/map.html)
 *
 * Example:
 * ```ts
 * const Todo = types.model({
 *   id: types.identifier,
 *   task: types.string
 * })
 *
 * const TodoStore = types.model({
 *   todos: types.map(Todo)
 * })
 *
 * const s = TodoStore.create({ todos: {} })
 * unprotect(s)
 * s.todos.set(17, { task: "Grab coffee", id: 17 })
 * s.todos.put({ task: "Grab cookie", id: 18 }) // put will infer key from the identifier
 * console.log(s.todos.get(17).task) // prints: "Grab coffee"
 * ```
 *
 * @param subtype
 * @returns
 */
function map(subtype) {
    return new MapType("map<string, " + subtype.name + ">", subtype);
}
/**
 * Returns if a given value represents a map type.
 *
 * @param type
 * @returns `true` if it is a map type.
 */
function isMapType(type) {
    return isType(type) && (type.flags & TypeFlags.Map) > 0;
}

/**
 * @internal
 * @hidden
 */
var ArrayType = /** @class */ (function (_super) {
    __extends(ArrayType, _super);
    function ArrayType(name, _subType, hookInitializers) {
        if (hookInitializers === void 0) { hookInitializers = []; }
        var _this = _super.call(this, name) || this;
        _this._subType = _subType;
        _this.flags = TypeFlags.Array;
        _this.hookInitializers = [];
        _this.hookInitializers = hookInitializers;
        return _this;
    }
    ArrayType.prototype.hooks = function (hooks) {
        var hookInitializers = this.hookInitializers.length > 0 ? this.hookInitializers.concat(hooks) : [hooks];
        return new ArrayType(this.name, this._subType, hookInitializers);
    };
    ArrayType.prototype.instantiate = function (parent, subpath, environment, initialValue) {
        return createObjectNode(this, parent, subpath, environment, initialValue);
    };
    ArrayType.prototype.initializeChildNodes = function (objNode, snapshot) {
        if (snapshot === void 0) { snapshot = []; }
        var subType = objNode.type._subType;
        var result = {};
        snapshot.forEach(function (item, index) {
            var subpath = "" + index;
            result[subpath] = subType.instantiate(objNode, subpath, undefined, item);
        });
        return result;
    };
    ArrayType.prototype.createNewInstance = function (childNodes) {
        return mobx.observable.array(convertChildNodesToArray(childNodes), mobxShallow);
    };
    ArrayType.prototype.finalizeNewInstance = function (node, instance) {
        mobx._getAdministration(instance).dehancer = node.unbox;
        var type = node.type;
        type.hookInitializers.forEach(function (initializer) {
            var hooks = initializer(instance);
            Object.keys(hooks).forEach(function (name) {
                var hook = hooks[name];
                var actionInvoker = createActionInvoker(instance, name, hook);
                (!devMode() ? addHiddenFinalProp : addHiddenWritableProp)(instance, name, actionInvoker);
            });
        });
        mobx.intercept(instance, this.willChange);
        mobx.observe(instance, this.didChange);
    };
    ArrayType.prototype.describe = function () {
        return this._subType.describe() + "[]";
    };
    ArrayType.prototype.getChildren = function (node) {
        return node.storedValue.slice();
    };
    ArrayType.prototype.getChildNode = function (node, key) {
        var index = Number(key);
        if (index < node.storedValue.length)
            return node.storedValue[index];
        throw fail$1("Not a child: " + key);
    };
    ArrayType.prototype.willChange = function (change) {
        var node = getStateTreeNode(change.object);
        node.assertWritable({ subpath: "" + change.index });
        var subType = node.type._subType;
        var childNodes = node.getChildren();
        switch (change.type) {
            case "update":
                {
                    if (change.newValue === change.object[change.index])
                        return null;
                    var updatedNodes = reconcileArrayChildren(node, subType, [childNodes[change.index]], [change.newValue], [change.index]);
                    if (!updatedNodes) {
                        return null;
                    }
                    change.newValue = updatedNodes[0];
                }
                break;
            case "splice":
                {
                    var index_1 = change.index, removedCount = change.removedCount, added = change.added;
                    var addedNodes = reconcileArrayChildren(node, subType, childNodes.slice(index_1, index_1 + removedCount), added, added.map(function (_, i) { return index_1 + i; }));
                    if (!addedNodes) {
                        return null;
                    }
                    change.added = addedNodes;
                    // update paths of remaining items
                    for (var i = index_1 + removedCount; i < childNodes.length; i++) {
                        childNodes[i].setParent(node, "" + (i + added.length - removedCount));
                    }
                }
                break;
        }
        return change;
    };
    ArrayType.prototype.getSnapshot = function (node) {
        return node.getChildren().map(function (childNode) { return childNode.snapshot; });
    };
    ArrayType.prototype.processInitialSnapshot = function (childNodes) {
        var processed = [];
        Object.keys(childNodes).forEach(function (key) {
            processed.push(childNodes[key].getSnapshot());
        });
        return processed;
    };
    ArrayType.prototype.didChange = function (change) {
        var node = getStateTreeNode(change.object);
        switch (change.type) {
            case "update":
                return void node.emitPatch({
                    op: "replace",
                    path: "" + change.index,
                    value: change.newValue.snapshot,
                    oldValue: change.oldValue ? change.oldValue.snapshot : undefined
                }, node);
            case "splice":
                for (var i = change.removedCount - 1; i >= 0; i--)
                    node.emitPatch({
                        op: "remove",
                        path: "" + (change.index + i),
                        oldValue: change.removed[i].snapshot
                    }, node);
                for (var i = 0; i < change.addedCount; i++)
                    node.emitPatch({
                        op: "add",
                        path: "" + (change.index + i),
                        value: node.getChildNode("" + (change.index + i)).snapshot,
                        oldValue: undefined
                    }, node);
                return;
        }
    };
    ArrayType.prototype.applyPatchLocally = function (node, subpath, patch) {
        var target = node.storedValue;
        var index = subpath === "-" ? target.length : Number(subpath);
        switch (patch.op) {
            case "replace":
                target[index] = patch.value;
                break;
            case "add":
                target.splice(index, 0, patch.value);
                break;
            case "remove":
                target.splice(index, 1);
                break;
        }
    };
    ArrayType.prototype.applySnapshot = function (node, snapshot) {
        typecheckInternal(this, snapshot);
        var target = node.storedValue;
        target.replace(snapshot);
    };
    ArrayType.prototype.getChildType = function () {
        return this._subType;
    };
    ArrayType.prototype.isValidSnapshot = function (value, context) {
        var _this = this;
        if (!isArray(value)) {
            return typeCheckFailure(context, value, "Value is not an array");
        }
        return flattenTypeErrors(value.map(function (item, index) {
            return _this._subType.validate(item, getContextForPath(context, "" + index, _this._subType));
        }));
    };
    ArrayType.prototype.getDefaultSnapshot = function () {
        return EMPTY_ARRAY;
    };
    ArrayType.prototype.removeChild = function (node, subpath) {
        node.storedValue.splice(Number(subpath), 1);
    };
    __decorate([
        mobx.action
    ], ArrayType.prototype, "applySnapshot", null);
    return ArrayType;
}(ComplexType));
/**
 * `types.array` - Creates an index based collection type who's children are all of a uniform declared type.
 *
 * This type will always produce [observable arrays](https://mobx.js.org/refguide/array.html)
 *
 * Example:
 * ```ts
 * const Todo = types.model({
 *   task: types.string
 * })
 *
 * const TodoStore = types.model({
 *   todos: types.array(Todo)
 * })
 *
 * const s = TodoStore.create({ todos: [] })
 * unprotect(s) // needed to allow modifying outside of an action
 * s.todos.push({ task: "Grab coffee" })
 * console.log(s.todos[0]) // prints: "Grab coffee"
 * ```
 *
 * @param subtype
 * @returns
 */
function array(subtype) {
    assertIsType(subtype, 1);
    return new ArrayType(subtype.name + "[]", subtype);
}
function reconcileArrayChildren(parent, childType, oldNodes, newValues, newPaths) {
    var nothingChanged = true;
    for (var i = 0;; i++) {
        var hasNewNode = i <= newValues.length - 1;
        var oldNode = oldNodes[i];
        var newValue = hasNewNode ? newValues[i] : undefined;
        var newPath = "" + newPaths[i];
        // for some reason, instead of newValue we got a node, fallback to the storedValue
        // TODO: https://github.com/mobxjs/mobx-state-tree/issues/340#issuecomment-325581681
        if (isNode(newValue))
            newValue = newValue.storedValue;
        if (!oldNode && !hasNewNode) {
            // both are empty, end
            break;
        }
        else if (!hasNewNode) {
            // new one does not exists
            nothingChanged = false;
            oldNodes.splice(i, 1);
            if (oldNode instanceof ObjectNode) {
                // since it is going to be returned by pop/splice/shift better create it before killing it
                // so it doesn't end up in an undead state
                oldNode.createObservableInstanceIfNeeded();
            }
            oldNode.die();
            i--;
        }
        else if (!oldNode) {
            // there is no old node, create it
            // check if already belongs to the same parent. if so, avoid pushing item in. only swapping can occur.
            if (isStateTreeNode(newValue) && getStateTreeNode(newValue).parent === parent) {
                // this node is owned by this parent, but not in the reconcilable set, so it must be double
                throw fail$1("Cannot add an object to a state tree if it is already part of the same or another state tree. Tried to assign an object to '" + parent.path + "/" + newPath + "', but it lives already at '" + getStateTreeNode(newValue).path + "'");
            }
            nothingChanged = false;
            var newNode = valueAsNode(childType, parent, newPath, newValue);
            oldNodes.splice(i, 0, newNode);
        }
        else if (areSame(oldNode, newValue)) {
            // both are the same, reconcile
            oldNodes[i] = valueAsNode(childType, parent, newPath, newValue, oldNode);
        }
        else {
            // nothing to do, try to reorder
            var oldMatch = undefined;
            // find a possible candidate to reuse
            for (var j = i; j < oldNodes.length; j++) {
                if (areSame(oldNodes[j], newValue)) {
                    oldMatch = oldNodes.splice(j, 1)[0];
                    break;
                }
            }
            nothingChanged = false;
            var newNode = valueAsNode(childType, parent, newPath, newValue, oldMatch);
            oldNodes.splice(i, 0, newNode);
        }
    }
    return nothingChanged ? null : oldNodes;
}
/**
 * Convert a value to a node at given parent and subpath. Attempts to reuse old node if possible and given.
 */
function valueAsNode(childType, parent, subpath, newValue, oldNode) {
    // ensure the value is valid-ish
    typecheckInternal(childType, newValue);
    function getNewNode() {
        // the new value has a MST node
        if (isStateTreeNode(newValue)) {
            var childNode = getStateTreeNode(newValue);
            childNode.assertAlive(EMPTY_OBJECT);
            // the node lives here
            if (childNode.parent !== null && childNode.parent === parent) {
                childNode.setParent(parent, subpath);
                return childNode;
            }
        }
        // there is old node and new one is a value/snapshot
        if (oldNode) {
            return childType.reconcile(oldNode, newValue, parent, subpath);
        }
        // nothing to do, create from scratch
        return childType.instantiate(parent, subpath, undefined, newValue);
    }
    var newNode = getNewNode();
    if (oldNode && oldNode !== newNode) {
        if (oldNode instanceof ObjectNode) {
            // since it is going to be returned by pop/splice/shift better create it before killing it
            // so it doesn't end up in an undead state
            oldNode.createObservableInstanceIfNeeded();
        }
        oldNode.die();
    }
    return newNode;
}
/**
 * Check if a node holds a value.
 */
function areSame(oldNode, newValue) {
    // never consider dead old nodes for reconciliation
    if (!oldNode.isAlive) {
        return false;
    }
    // the new value has the same node
    if (isStateTreeNode(newValue)) {
        var newNode = getStateTreeNode(newValue);
        return newNode.isAlive && newNode === oldNode;
    }
    // the provided value is the snapshot of the old node
    if (oldNode.snapshot === newValue) {
        return true;
    }
    // new value is a snapshot with the correct identifier
    return (oldNode instanceof ObjectNode &&
        oldNode.identifier !== null &&
        oldNode.identifierAttribute &&
        isPlainObject(newValue) &&
        oldNode.identifier === normalizeIdentifier(newValue[oldNode.identifierAttribute]) &&
        oldNode.type.is(newValue));
}
/**
 * Returns if a given value represents an array type.
 *
 * @param type
 * @returns `true` if the type is an array type.
 */
function isArrayType(type) {
    return isType(type) && (type.flags & TypeFlags.Array) > 0;
}

var PRE_PROCESS_SNAPSHOT = "preProcessSnapshot";
var POST_PROCESS_SNAPSHOT = "postProcessSnapshot";
function objectTypeToString() {
    return getStateTreeNode(this).toString();
}
var defaultObjectOptions = {
    name: "AnonymousModel",
    properties: {},
    initializers: EMPTY_ARRAY
};
function toPropertiesObject(declaredProps) {
    // loop through properties and ensures that all items are types
    return Object.keys(declaredProps).reduce(function (props, key) {
        var _a, _b, _c;
        // warn if user intended a HOOK
        if (key in Hook)
            throw fail$1("Hook '" + key + "' was defined as property. Hooks should be defined as part of the actions");
        // the user intended to use a view
        var descriptor = Object.getOwnPropertyDescriptor(props, key);
        if ("get" in descriptor) {
            throw fail$1("Getters are not supported as properties. Please use views instead");
        }
        // undefined and null are not valid
        var value = descriptor.value;
        if (value === null || value === undefined) {
            throw fail$1("The default value of an attribute cannot be null or undefined as the type cannot be inferred. Did you mean `types.maybe(someType)`?");
            // its a primitive, convert to its type
        }
        else if (isPrimitive(value)) {
            return Object.assign({}, props, (_a = {},
                _a[key] = optional(getPrimitiveFactoryFromValue(value), value),
                _a));
            // map defaults to empty object automatically for models
        }
        else if (value instanceof MapType) {
            return Object.assign({}, props, (_b = {},
                _b[key] = optional(value, {}),
                _b));
        }
        else if (value instanceof ArrayType) {
            return Object.assign({}, props, (_c = {}, _c[key] = optional(value, []), _c));
            // its already a type
        }
        else if (isType(value)) {
            return props;
            // its a function, maybe the user wanted a view?
        }
        else if (devMode() && typeof value === "function") {
            throw fail$1("Invalid type definition for property '" + key + "', it looks like you passed a function. Did you forget to invoke it, or did you intend to declare a view / action?");
            // no other complex values
        }
        else if (devMode() && typeof value === "object") {
            throw fail$1("Invalid type definition for property '" + key + "', it looks like you passed an object. Try passing another model type or a types.frozen.");
            // WTF did you pass in mate?
        }
        else {
            throw fail$1("Invalid type definition for property '" + key + "', cannot infer a type from a value like '" + value + "' (" + typeof value + ")");
        }
    }, declaredProps);
}
/**
 * @internal
 * @hidden
 */
var ModelType = /** @class */ (function (_super) {
    __extends(ModelType, _super);
    function ModelType(opts) {
        var _this = _super.call(this, opts.name || defaultObjectOptions.name) || this;
        _this.flags = TypeFlags.Object;
        _this.named = function (name) {
            return _this.cloneAndEnhance({ name: name });
        };
        _this.props = function (properties) {
            return _this.cloneAndEnhance({ properties: properties });
        };
        _this.preProcessSnapshot = function (preProcessor) {
            var currentPreprocessor = _this.preProcessor;
            if (!currentPreprocessor)
                return _this.cloneAndEnhance({ preProcessor: preProcessor });
            else
                return _this.cloneAndEnhance({
                    preProcessor: function (snapshot) { return currentPreprocessor(preProcessor(snapshot)); }
                });
        };
        _this.postProcessSnapshot = function (postProcessor) {
            var currentPostprocessor = _this.postProcessor;
            if (!currentPostprocessor)
                return _this.cloneAndEnhance({ postProcessor: postProcessor });
            else
                return _this.cloneAndEnhance({
                    postProcessor: function (snapshot) { return postProcessor(currentPostprocessor(snapshot)); }
                });
        };
        Object.assign(_this, defaultObjectOptions, opts);
        // ensures that any default value gets converted to its related type
        _this.properties = toPropertiesObject(_this.properties);
        freeze(_this.properties); // make sure nobody messes with it
        _this.propertyNames = Object.keys(_this.properties);
        _this.identifierAttribute = _this._getIdentifierAttribute();
        return _this;
    }
    ModelType.prototype._getIdentifierAttribute = function () {
        var identifierAttribute = undefined;
        this.forAllProps(function (propName, propType) {
            if (propType.flags & TypeFlags.Identifier) {
                if (identifierAttribute)
                    throw fail$1("Cannot define property '" + propName + "' as object identifier, property '" + identifierAttribute + "' is already defined as identifier property");
                identifierAttribute = propName;
            }
        });
        return identifierAttribute;
    };
    ModelType.prototype.cloneAndEnhance = function (opts) {
        return new ModelType({
            name: opts.name || this.name,
            properties: Object.assign({}, this.properties, opts.properties),
            initializers: this.initializers.concat(opts.initializers || []),
            preProcessor: opts.preProcessor || this.preProcessor,
            postProcessor: opts.postProcessor || this.postProcessor
        });
    };
    ModelType.prototype.actions = function (fn) {
        var _this = this;
        var actionInitializer = function (self) {
            _this.instantiateActions(self, fn(self));
            return self;
        };
        return this.cloneAndEnhance({ initializers: [actionInitializer] });
    };
    ModelType.prototype.instantiateActions = function (self, actions) {
        // check if return is correct
        if (!isPlainObject(actions))
            throw fail$1("actions initializer should return a plain object containing actions");
        // bind actions to the object created
        Object.keys(actions).forEach(function (name) {
            // warn if preprocessor was given
            if (name === PRE_PROCESS_SNAPSHOT)
                throw fail$1("Cannot define action '" + PRE_PROCESS_SNAPSHOT + "', it should be defined using 'type.preProcessSnapshot(fn)' instead");
            // warn if postprocessor was given
            if (name === POST_PROCESS_SNAPSHOT)
                throw fail$1("Cannot define action '" + POST_PROCESS_SNAPSHOT + "', it should be defined using 'type.postProcessSnapshot(fn)' instead");
            var action2 = actions[name];
            // apply hook composition
            var baseAction = self[name];
            if (name in Hook && baseAction) {
                var specializedAction_1 = action2;
                action2 = function () {
                    baseAction.apply(null, arguments);
                    specializedAction_1.apply(null, arguments);
                };
            }
            // the goal of this is to make sure actions using "this" can call themselves,
            // while still allowing the middlewares to register them
            var middlewares = action2.$mst_middleware; // make sure middlewares are not lost
            var boundAction = action2.bind(actions);
            boundAction.$mst_middleware = middlewares;
            var actionInvoker = createActionInvoker(self, name, boundAction);
            actions[name] = actionInvoker;
            (!devMode() ? addHiddenFinalProp : addHiddenWritableProp)(self, name, actionInvoker);
        });
    };
    ModelType.prototype.volatile = function (fn) {
        var _this = this;
        var stateInitializer = function (self) {
            _this.instantiateVolatileState(self, fn(self));
            return self;
        };
        return this.cloneAndEnhance({ initializers: [stateInitializer] });
    };
    ModelType.prototype.instantiateVolatileState = function (self, state) {
        // check views return
        if (!isPlainObject(state))
            throw fail$1("volatile state initializer should return a plain object containing state");
        mobx.set(self, state);
    };
    ModelType.prototype.extend = function (fn) {
        var _this = this;
        var initializer = function (self) {
            var _a = fn(self), actions = _a.actions, views = _a.views, state = _a.state, rest = __rest(_a, ["actions", "views", "state"]);
            for (var key in rest)
                throw fail$1("The `extend` function should return an object with a subset of the fields 'actions', 'views' and 'state'. Found invalid key '" + key + "'");
            if (state)
                _this.instantiateVolatileState(self, state);
            if (views)
                _this.instantiateViews(self, views);
            if (actions)
                _this.instantiateActions(self, actions);
            return self;
        };
        return this.cloneAndEnhance({ initializers: [initializer] });
    };
    ModelType.prototype.views = function (fn) {
        var _this = this;
        var viewInitializer = function (self) {
            _this.instantiateViews(self, fn(self));
            return self;
        };
        return this.cloneAndEnhance({ initializers: [viewInitializer] });
    };
    ModelType.prototype.instantiateViews = function (self, views) {
        // check views return
        if (!isPlainObject(views))
            throw fail$1("views initializer should return a plain object containing views");
        Object.keys(views).forEach(function (key) {
            // is this a computed property?
            var descriptor = Object.getOwnPropertyDescriptor(views, key);
            if ("get" in descriptor) {
                if (mobx.isComputedProp(self, key)) {
                    var computedValue = mobx._getAdministration(self, key);
                    // TODO: mobx currently does not allow redefining computes yet, pending #1121
                    // FIXME: this binds to the internals of mobx!
                    computedValue.derivation = descriptor.get;
                    computedValue.scope = self;
                    if (descriptor.set)
                        computedValue.setter = mobx.action(computedValue.name + "-setter", descriptor.set);
                }
                else {
                    mobx.computed(self, key, descriptor, true);
                }
            }
            else if (typeof descriptor.value === "function") {
                (!devMode() ? addHiddenFinalProp : addHiddenWritableProp)(self, key, descriptor.value);
            }
            else {
                throw fail$1("A view member should either be a function or getter based property");
            }
        });
    };
    ModelType.prototype.instantiate = function (parent, subpath, environment, initialValue) {
        var value = isStateTreeNode(initialValue)
            ? initialValue
            : this.applySnapshotPreProcessor(initialValue);
        return createObjectNode(this, parent, subpath, environment, value);
        // Optimization: record all prop- view- and action names after first construction, and generate an optimal base class
        // that pre-reserves all these fields for fast object-member lookups
    };
    ModelType.prototype.initializeChildNodes = function (objNode, initialSnapshot) {
        if (initialSnapshot === void 0) { initialSnapshot = {}; }
        var type = objNode.type;
        var result = {};
        type.forAllProps(function (name, childType) {
            result[name] = childType.instantiate(objNode, name, undefined, initialSnapshot[name]);
        });
        return result;
    };
    ModelType.prototype.createNewInstance = function (childNodes) {
        return mobx.observable.object(childNodes, EMPTY_OBJECT, mobxShallow);
    };
    ModelType.prototype.finalizeNewInstance = function (node, instance) {
        addHiddenFinalProp(instance, "toString", objectTypeToString);
        this.forAllProps(function (name) {
            mobx._interceptReads(instance, name, node.unbox);
        });
        this.initializers.reduce(function (self, fn) { return fn(self); }, instance);
        mobx.intercept(instance, this.willChange);
        mobx.observe(instance, this.didChange);
    };
    ModelType.prototype.willChange = function (chg) {
        // TODO: mobx typings don't seem to take into account that newValue can be set even when removing a prop
        var change = chg;
        var node = getStateTreeNode(change.object);
        var subpath = change.name;
        node.assertWritable({ subpath: subpath });
        var childType = node.type.properties[subpath];
        // only properties are typed, state are stored as-is references
        if (childType) {
            typecheckInternal(childType, change.newValue);
            change.newValue = childType.reconcile(node.getChildNode(subpath), change.newValue, node, subpath);
        }
        return change;
    };
    ModelType.prototype.didChange = function (chg) {
        // TODO: mobx typings don't seem to take into account that newValue can be set even when removing a prop
        var change = chg;
        var childNode = getStateTreeNode(change.object);
        var childType = childNode.type.properties[change.name];
        if (!childType) {
            // don't emit patches for volatile state
            return;
        }
        var oldChildValue = change.oldValue ? change.oldValue.snapshot : undefined;
        childNode.emitPatch({
            op: "replace",
            path: escapeJsonPath(change.name),
            value: change.newValue.snapshot,
            oldValue: oldChildValue
        }, childNode);
    };
    ModelType.prototype.getChildren = function (node) {
        var _this = this;
        var res = [];
        this.forAllProps(function (name) {
            res.push(_this.getChildNode(node, name));
        });
        return res;
    };
    ModelType.prototype.getChildNode = function (node, key) {
        if (!(key in this.properties))
            throw fail$1("Not a value property: " + key);
        var childNode = mobx._getAdministration(node.storedValue, key).value; // TODO: blegh!
        if (!childNode)
            throw fail$1("Node not available for property " + key);
        return childNode;
    };
    ModelType.prototype.getSnapshot = function (node, applyPostProcess) {
        var _this = this;
        if (applyPostProcess === void 0) { applyPostProcess = true; }
        var res = {};
        this.forAllProps(function (name, type) {
            mobx.getAtom(node.storedValue, name).reportObserved();
            res[name] = _this.getChildNode(node, name).snapshot;
        });
        if (applyPostProcess) {
            return this.applySnapshotPostProcessor(res);
        }
        return res;
    };
    ModelType.prototype.processInitialSnapshot = function (childNodes) {
        var processed = {};
        Object.keys(childNodes).forEach(function (key) {
            processed[key] = childNodes[key].getSnapshot();
        });
        return this.applySnapshotPostProcessor(processed);
    };
    ModelType.prototype.applyPatchLocally = function (node, subpath, patch) {
        if (!(patch.op === "replace" || patch.op === "add")) {
            throw fail$1("object does not support operation " + patch.op);
        }
        node.storedValue[subpath] = patch.value;
    };
    ModelType.prototype.applySnapshot = function (node, snapshot) {
        var preProcessedSnapshot = this.applySnapshotPreProcessor(snapshot);
        typecheckInternal(this, preProcessedSnapshot);
        this.forAllProps(function (name) {
            node.storedValue[name] = preProcessedSnapshot[name];
        });
    };
    ModelType.prototype.applySnapshotPreProcessor = function (snapshot) {
        var processor = this.preProcessor;
        return processor ? processor.call(null, snapshot) : snapshot;
    };
    ModelType.prototype.applySnapshotPostProcessor = function (snapshot) {
        var postProcessor = this.postProcessor;
        if (postProcessor)
            return postProcessor.call(null, snapshot);
        return snapshot;
    };
    ModelType.prototype.getChildType = function (propertyName) {
        assertIsString(propertyName, 1);
        return this.properties[propertyName];
    };
    ModelType.prototype.isValidSnapshot = function (value, context) {
        var _this = this;
        var snapshot = this.applySnapshotPreProcessor(value);
        if (!isPlainObject(snapshot)) {
            return typeCheckFailure(context, snapshot, "Value is not a plain object");
        }
        return flattenTypeErrors(this.propertyNames.map(function (key) {
            return _this.properties[key].validate(snapshot[key], getContextForPath(context, key, _this.properties[key]));
        }));
    };
    ModelType.prototype.forAllProps = function (fn) {
        var _this = this;
        this.propertyNames.forEach(function (key) { return fn(key, _this.properties[key]); });
    };
    ModelType.prototype.describe = function () {
        var _this = this;
        // optimization: cache
        return ("{ " +
            this.propertyNames.map(function (key) { return key + ": " + _this.properties[key].describe(); }).join("; ") +
            " }");
    };
    ModelType.prototype.getDefaultSnapshot = function () {
        return EMPTY_OBJECT;
    };
    ModelType.prototype.removeChild = function (node, subpath) {
        node.storedValue[subpath] = undefined;
    };
    __decorate([
        mobx.action
    ], ModelType.prototype, "applySnapshot", null);
    return ModelType;
}(ComplexType));
/**
 * `types.model` - Creates a new model type by providing a name, properties, volatile state and actions.
 *
 * See the [model type](/concepts/trees#creating-models) description or the [getting started](intro/getting-started.md#getting-started-1) tutorial.
 */
function model() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var name = typeof args[0] === "string" ? args.shift() : "AnonymousModel";
    var properties = args.shift() || {};
    return new ModelType({ name: name, properties: properties });
}
/**
 * `types.compose` - Composes a new model from one or more existing model types.
 * This method can be invoked in two forms:
 * Given 2 or more model types, the types are composed into a new Type.
 * Given first parameter as a string and 2 or more model types,
 * the types are composed into a new Type with the given name
 */
function compose() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    // TODO: just join the base type names if no name is provided
    var hasTypename = typeof args[0] === "string";
    var typeName = hasTypename ? args[0] : "AnonymousModel";
    if (hasTypename) {
        args.shift();
    }
    // check all parameters
    if (devMode()) {
        args.forEach(function (type, i) {
            assertArg(type, isModelType, "mobx-state-tree model type", hasTypename ? i + 2 : i + 1);
        });
    }
    return args
        .reduce(function (prev, cur) {
        return prev.cloneAndEnhance({
            name: prev.name + "_" + cur.name,
            properties: cur.properties,
            initializers: cur.initializers,
            preProcessor: function (snapshot) {
                return cur.applySnapshotPreProcessor(prev.applySnapshotPreProcessor(snapshot));
            },
            postProcessor: function (snapshot) {
                return cur.applySnapshotPostProcessor(prev.applySnapshotPostProcessor(snapshot));
            }
        });
    })
        .named(typeName);
}
/**
 * Returns if a given value represents a model type.
 *
 * @param type
 * @returns
 */
function isModelType(type) {
    return isType(type) && (type.flags & TypeFlags.Object) > 0;
}

// TODO: implement CoreType using types.custom ?
/**
 * @internal
 * @hidden
 */
var CoreType = /** @class */ (function (_super) {
    __extends(CoreType, _super);
    function CoreType(name, flags, checker, initializer) {
        if (initializer === void 0) { initializer = identity; }
        var _this = _super.call(this, name) || this;
        _this.flags = flags;
        _this.checker = checker;
        _this.initializer = initializer;
        _this.flags = flags;
        return _this;
    }
    CoreType.prototype.describe = function () {
        return this.name;
    };
    CoreType.prototype.instantiate = function (parent, subpath, environment, initialValue) {
        return createScalarNode(this, parent, subpath, environment, initialValue);
    };
    CoreType.prototype.createNewInstance = function (snapshot) {
        return this.initializer(snapshot);
    };
    CoreType.prototype.isValidSnapshot = function (value, context) {
        if (isPrimitive(value) && this.checker(value)) {
            return typeCheckSuccess();
        }
        var typeName = this.name === "Date" ? "Date or a unix milliseconds timestamp" : this.name;
        return typeCheckFailure(context, value, "Value is not a " + typeName);
    };
    return CoreType;
}(SimpleType));
/**
 * `types.string` - Creates a type that can only contain a string value.
 * This type is used for string values by default
 *
 * Example:
 * ```ts
 * const Person = types.model({
 *   firstName: types.string,
 *   lastName: "Doe"
 * })
 * ```
 */
// tslint:disable-next-line:variable-name
var string = new CoreType("string", TypeFlags.String, function (v) { return typeof v === "string"; });
/**
 * `types.number` - Creates a type that can only contain a numeric value.
 * This type is used for numeric values by default
 *
 * Example:
 * ```ts
 * const Vector = types.model({
 *   x: types.number,
 *   y: 1.5
 * })
 * ```
 */
// tslint:disable-next-line:variable-name
var number = new CoreType("number", TypeFlags.Number, function (v) { return typeof v === "number"; });
/**
 * `types.integer` - Creates a type that can only contain an integer value.
 * This type is used for integer values by default
 *
 * Example:
 * ```ts
 * const Size = types.model({
 *   width: types.integer,
 *   height: 10
 * })
 * ```
 */
// tslint:disable-next-line:variable-name
var integer = new CoreType("integer", TypeFlags.Integer, function (v) { return isInteger(v); });
/**
 * `types.boolean` - Creates a type that can only contain a boolean value.
 * This type is used for boolean values by default
 *
 * Example:
 * ```ts
 * const Thing = types.model({
 *   isCool: types.boolean,
 *   isAwesome: false
 * })
 * ```
 */
// tslint:disable-next-line:variable-name
var boolean = new CoreType("boolean", TypeFlags.Boolean, function (v) { return typeof v === "boolean"; });
/**
 * `types.null` - The type of the value `null`
 */
var nullType = new CoreType("null", TypeFlags.Null, function (v) { return v === null; });
/**
 * `types.undefined` - The type of the value `undefined`
 */
var undefinedType = new CoreType("undefined", TypeFlags.Undefined, function (v) { return v === undefined; });
var _DatePrimitive = new CoreType("Date", TypeFlags.Date, function (v) { return typeof v === "number" || v instanceof Date; }, function (v) { return (v instanceof Date ? v : new Date(v)); });
_DatePrimitive.getSnapshot = function (node) {
    return node.storedValue.getTime();
};
/**
 * `types.Date` - Creates a type that can only contain a javascript Date value.
 *
 * Example:
 * ```ts
 * const LogLine = types.model({
 *   timestamp: types.Date,
 * })
 *
 * LogLine.create({ timestamp: new Date() })
 * ```
 */
var DatePrimitive = _DatePrimitive;
/**
 * @internal
 * @hidden
 */
function getPrimitiveFactoryFromValue(value) {
    switch (typeof value) {
        case "string":
            return string;
        case "number":
            return number; // In the future, isInteger(value) ? integer : number would be interesting, but would be too breaking for now
        case "boolean":
            return boolean;
        case "object":
            if (value instanceof Date)
                return DatePrimitive;
    }
    throw fail$1("Cannot determine primitive type from value " + value);
}
/**
 * Returns if a given value represents a primitive type.
 *
 * @param type
 * @returns
 */
function isPrimitiveType(type) {
    return (isType(type) &&
        (type.flags &
            (TypeFlags.String |
                TypeFlags.Number |
                TypeFlags.Integer |
                TypeFlags.Boolean |
                TypeFlags.Date)) >
            0);
}

/**
 * @internal
 * @hidden
 */
var Literal = /** @class */ (function (_super) {
    __extends(Literal, _super);
    function Literal(value) {
        var _this = _super.call(this, JSON.stringify(value)) || this;
        _this.flags = TypeFlags.Literal;
        _this.value = value;
        return _this;
    }
    Literal.prototype.instantiate = function (parent, subpath, environment, initialValue) {
        return createScalarNode(this, parent, subpath, environment, initialValue);
    };
    Literal.prototype.describe = function () {
        return JSON.stringify(this.value);
    };
    Literal.prototype.isValidSnapshot = function (value, context) {
        if (isPrimitive(value) && value === this.value) {
            return typeCheckSuccess();
        }
        return typeCheckFailure(context, value, "Value is not a literal " + JSON.stringify(this.value));
    };
    return Literal;
}(SimpleType));
/**
 * `types.literal` - The literal type will return a type that will match only the exact given type.
 * The given value must be a primitive, in order to be serialized to a snapshot correctly.
 * You can use literal to match exact strings for example the exact male or female string.
 *
 * Example:
 * ```ts
 * const Person = types.model({
 *     name: types.string,
 *     gender: types.union(types.literal('male'), types.literal('female'))
 * })
 * ```
 *
 * @param value The value to use in the strict equal check
 * @returns
 */
function literal(value) {
    // check that the given value is a primitive
    assertArg(value, isPrimitive, "primitive", 1);
    return new Literal(value);
}
/**
 * Returns if a given value represents a literal type.
 *
 * @param type
 * @returns
 */
function isLiteralType(type) {
    return isType(type) && (type.flags & TypeFlags.Literal) > 0;
}

var Refinement = /** @class */ (function (_super) {
    __extends(Refinement, _super);
    function Refinement(name, _subtype, _predicate, _message) {
        var _this = _super.call(this, name) || this;
        _this._subtype = _subtype;
        _this._predicate = _predicate;
        _this._message = _message;
        return _this;
    }
    Object.defineProperty(Refinement.prototype, "flags", {
        get: function () {
            return this._subtype.flags | TypeFlags.Refinement;
        },
        enumerable: true,
        configurable: true
    });
    Refinement.prototype.describe = function () {
        return this.name;
    };
    Refinement.prototype.instantiate = function (parent, subpath, environment, initialValue) {
        // create the child type
        return this._subtype.instantiate(parent, subpath, environment, initialValue);
    };
    Refinement.prototype.isAssignableFrom = function (type) {
        return this._subtype.isAssignableFrom(type);
    };
    Refinement.prototype.isValidSnapshot = function (value, context) {
        var subtypeErrors = this._subtype.validate(value, context);
        if (subtypeErrors.length > 0)
            return subtypeErrors;
        var snapshot = isStateTreeNode(value) ? getStateTreeNode(value).snapshot : value;
        if (!this._predicate(snapshot)) {
            return typeCheckFailure(context, value, this._message(value));
        }
        return typeCheckSuccess();
    };
    Refinement.prototype.reconcile = function (current, newValue, parent, subpath) {
        return this._subtype.reconcile(current, newValue, parent, subpath);
    };
    Refinement.prototype.getSubTypes = function () {
        return this._subtype;
    };
    return Refinement;
}(BaseType));
/**
 * `types.refinement` - Creates a type that is more specific than the base type, e.g. `types.refinement(types.string, value => value.length > 5)` to create a type of strings that can only be longer then 5.
 *
 * @param name
 * @param type
 * @param predicate
 * @returns
 */
function refinement() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var name = typeof args[0] === "string" ? args.shift() : isType(args[0]) ? args[0].name : null;
    var type = args[0];
    var predicate = args[1];
    var message = args[2]
        ? args[2]
        : function (v) { return "Value does not respect the refinement predicate"; };
    // ensures all parameters are correct
    assertIsType(type, [1, 2]);
    assertIsString(name, 1);
    assertIsFunction(predicate, [2, 3]);
    assertIsFunction(message, [3, 4]);
    return new Refinement(name, type, predicate, message);
}
/**
 * Returns if a given value is a refinement type.
 *
 * @param type
 * @returns
 */
function isRefinementType(type) {
    return (type.flags & TypeFlags.Refinement) > 0;
}

/**
 * `types.enumeration` - Can be used to create an string based enumeration.
 * (note: this methods is just sugar for a union of string literals)
 *
 * Example:
 * ```ts
 * const TrafficLight = types.model({
 *   color: types.enumeration("Color", ["Red", "Orange", "Green"])
 * })
 * ```
 *
 * @param name descriptive name of the enumeration (optional)
 * @param options possible values this enumeration can have
 * @returns
 */
function enumeration(name, options) {
    var realOptions = typeof name === "string" ? options : name;
    // check all options
    if (devMode()) {
        realOptions.forEach(function (option, i) {
            assertIsString(option, i + 1);
        });
    }
    var type = union.apply(void 0, __spread(realOptions.map(function (option) { return literal("" + option); })));
    if (typeof name === "string")
        type.name = name;
    return type;
}

/**
 * @internal
 * @hidden
 */
var Union = /** @class */ (function (_super) {
    __extends(Union, _super);
    function Union(name, _types, options) {
        var _this = _super.call(this, name) || this;
        _this._types = _types;
        _this._eager = true;
        options = __assign({ eager: true, dispatcher: undefined }, options);
        _this._dispatcher = options.dispatcher;
        if (!options.eager)
            _this._eager = false;
        return _this;
    }
    Object.defineProperty(Union.prototype, "flags", {
        get: function () {
            var result = TypeFlags.Union;
            this._types.forEach(function (type) {
                result |= type.flags;
            });
            return result;
        },
        enumerable: true,
        configurable: true
    });
    Union.prototype.isAssignableFrom = function (type) {
        return this._types.some(function (subType) { return subType.isAssignableFrom(type); });
    };
    Union.prototype.describe = function () {
        return "(" + this._types.map(function (factory) { return factory.describe(); }).join(" | ") + ")";
    };
    Union.prototype.instantiate = function (parent, subpath, environment, initialValue) {
        var type = this.determineType(initialValue, undefined);
        if (!type)
            throw fail$1("No matching type for union " + this.describe()); // can happen in prod builds
        return type.instantiate(parent, subpath, environment, initialValue);
    };
    Union.prototype.reconcile = function (current, newValue, parent, subpath) {
        var type = this.determineType(newValue, current.type);
        if (!type)
            throw fail$1("No matching type for union " + this.describe()); // can happen in prod builds
        return type.reconcile(current, newValue, parent, subpath);
    };
    Union.prototype.determineType = function (value, reconcileCurrentType) {
        // try the dispatcher, if defined
        if (this._dispatcher) {
            return this._dispatcher(value);
        }
        // find the most accomodating type
        // if we are using reconciliation try the current node type first (fix for #1045)
        if (reconcileCurrentType) {
            if (reconcileCurrentType.is(value)) {
                return reconcileCurrentType;
            }
            return this._types.filter(function (t) { return t !== reconcileCurrentType; }).find(function (type) { return type.is(value); });
        }
        else {
            return this._types.find(function (type) { return type.is(value); });
        }
    };
    Union.prototype.isValidSnapshot = function (value, context) {
        if (this._dispatcher) {
            return this._dispatcher(value).validate(value, context);
        }
        var allErrors = [];
        var applicableTypes = 0;
        for (var i = 0; i < this._types.length; i++) {
            var type = this._types[i];
            var errors = type.validate(value, context);
            if (errors.length === 0) {
                if (this._eager)
                    return typeCheckSuccess();
                else
                    applicableTypes++;
            }
            else {
                allErrors.push(errors);
            }
        }
        if (applicableTypes === 1)
            return typeCheckSuccess();
        return typeCheckFailure(context, value, "No type is applicable for the union").concat(flattenTypeErrors(allErrors));
    };
    Union.prototype.getSubTypes = function () {
        return this._types;
    };
    return Union;
}(BaseType));
/**
 * `types.union` - Create a union of multiple types. If the correct type cannot be inferred unambiguously from a snapshot, provide a dispatcher function of the form `(snapshot) => Type`.
 *
 * @param optionsOrType
 * @param otherTypes
 * @returns
 */
function union(optionsOrType) {
    var otherTypes = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        otherTypes[_i - 1] = arguments[_i];
    }
    var options = isType(optionsOrType) ? undefined : optionsOrType;
    var types = isType(optionsOrType) ? __spread([optionsOrType], otherTypes) : otherTypes;
    var name = "(" + types.map(function (type) { return type.name; }).join(" | ") + ")";
    // check all options
    if (devMode()) {
        if (options) {
            assertArg(options, function (o) { return isPlainObject(o); }, "object { eager?: boolean, dispatcher?: Function }", 1);
        }
        types.forEach(function (type, i) {
            assertIsType(type, options ? i + 2 : i + 1);
        });
    }
    return new Union(name, types, options);
}
/**
 * Returns if a given value represents a union type.
 *
 * @param type
 * @returns
 */
function isUnionType(type) {
    return (type.flags & TypeFlags.Union) > 0;
}

/**
 * @hidden
 * @internal
 */
var OptionalValue = /** @class */ (function (_super) {
    __extends(OptionalValue, _super);
    function OptionalValue(_subtype, _defaultValue, optionalValues) {
        var _this = _super.call(this, _subtype.name) || this;
        _this._subtype = _subtype;
        _this._defaultValue = _defaultValue;
        _this.optionalValues = optionalValues;
        return _this;
    }
    Object.defineProperty(OptionalValue.prototype, "flags", {
        get: function () {
            return this._subtype.flags | TypeFlags.Optional;
        },
        enumerable: true,
        configurable: true
    });
    OptionalValue.prototype.describe = function () {
        return this._subtype.describe() + "?";
    };
    OptionalValue.prototype.instantiate = function (parent, subpath, environment, initialValue) {
        if (this.optionalValues.indexOf(initialValue) >= 0) {
            var defaultInstanceOrSnapshot = this.getDefaultInstanceOrSnapshot();
            return this._subtype.instantiate(parent, subpath, environment, defaultInstanceOrSnapshot);
        }
        return this._subtype.instantiate(parent, subpath, environment, initialValue);
    };
    OptionalValue.prototype.reconcile = function (current, newValue, parent, subpath) {
        return this._subtype.reconcile(current, this.optionalValues.indexOf(newValue) < 0 && this._subtype.is(newValue)
            ? newValue
            : this.getDefaultInstanceOrSnapshot(), parent, subpath);
    };
    OptionalValue.prototype.getDefaultInstanceOrSnapshot = function () {
        var defaultInstanceOrSnapshot = typeof this._defaultValue === "function"
            ? this._defaultValue()
            : this._defaultValue;
        // while static values are already snapshots and checked on types.optional
        // generator functions must always be rechecked just in case
        if (typeof this._defaultValue === "function") {
            typecheckInternal(this, defaultInstanceOrSnapshot);
        }
        return defaultInstanceOrSnapshot;
    };
    OptionalValue.prototype.isValidSnapshot = function (value, context) {
        // defaulted values can be skipped
        if (this.optionalValues.indexOf(value) >= 0) {
            return typeCheckSuccess();
        }
        // bounce validation to the sub-type
        return this._subtype.validate(value, context);
    };
    OptionalValue.prototype.isAssignableFrom = function (type) {
        return this._subtype.isAssignableFrom(type);
    };
    OptionalValue.prototype.getSubTypes = function () {
        return this._subtype;
    };
    return OptionalValue;
}(BaseType));
function checkOptionalPreconditions(type, defaultValueOrFunction) {
    // make sure we never pass direct instances
    if (typeof defaultValueOrFunction !== "function" && isStateTreeNode(defaultValueOrFunction)) {
        throw fail$1("default value cannot be an instance, pass a snapshot or a function that creates an instance/snapshot instead");
    }
    assertIsType(type, 1);
    if (devMode()) {
        // we only check default values if they are passed directly
        // if they are generator functions they will be checked once they are generated
        // we don't check generator function results here to avoid generating a node just for type-checking purposes
        // which might generate side-effects
        if (typeof defaultValueOrFunction !== "function") {
            typecheckInternal(type, defaultValueOrFunction);
        }
    }
}
/**
 * `types.optional` - Can be used to create a property with a default value.
 *
 * Depending on the third argument (`optionalValues`) there are two ways of operation:
 * - If the argument is not provided, then if a value is not provided in the snapshot (`undefined` or missing),
 *   it will default to the provided `defaultValue`
 * - If the argument is provided, then if the value in the snapshot matches one of the optional values inside the array then it will
 *   default to the provided `defaultValue`. Additionally, if one of the optional values inside the array is `undefined` then a missing
 *   property is also valid.
 *
 *   Note that it is also possible to include values of the same type as the intended subtype as optional values,
 *   in this case the optional value will be transformed into the `defaultValue` (e.g. `types.optional(types.string, "unnamed", [undefined, ""])`
 *   will transform the snapshot values `undefined` (and therefore missing) and empty strings into the string `"unnamed"` when it gets
 *   instantiated).
 *
 * If `defaultValue` is a function, the function will be invoked for every new instance.
 * Applying a snapshot in which the optional value is one of the optional values (or `undefined`/_not_ present if none are provided) causes the
 * value to be reset.
 *
 * Example:
 * ```ts
 * const Todo = types.model({
 *   title: types.string,
 *   subtitle1: types.optional(types.string, "", [null]),
 *   subtitle2: types.optional(types.string, "", [null, undefined]),
 *   done: types.optional(types.boolean, false),
 *   created: types.optional(types.Date, () => new Date()),
 * })
 *
 * // if done is missing / undefined it will become false
 * // if created is missing / undefined it will get a freshly generated timestamp
 * // if subtitle1 is null it will default to "", but it cannot be missing or undefined
 * // if subtitle2 is null or undefined it will default to ""; since it can be undefined it can also be missing
 * const todo = Todo.create({ title: "Get coffee", subtitle1: null })
 * ```
 *
 * @param type
 * @param defaultValueOrFunction
 * @param optionalValues an optional array with zero or more primitive values (string, number, boolean, null or undefined)
 *                       that will be converted into the default. `[ undefined ]` is assumed when none is provided
 * @returns
 */
function optional(type, defaultValueOrFunction, optionalValues) {
    checkOptionalPreconditions(type, defaultValueOrFunction);
    return new OptionalValue(type, defaultValueOrFunction, optionalValues ? optionalValues : undefinedAsOptionalValues);
}
var undefinedAsOptionalValues = [undefined];
/**
 * Returns if a value represents an optional type.
 *
 * @template IT
 * @param type
 * @returns
 */
function isOptionalType(type) {
    return isType(type) && (type.flags & TypeFlags.Optional) > 0;
}

var optionalUndefinedType = optional(undefinedType, undefined);
var optionalNullType = optional(nullType, null);
/**
 * `types.maybe` - Maybe will make a type nullable, and also optional.
 * The value `undefined` will be used to represent nullability.
 *
 * @param type
 * @returns
 */
function maybe(type) {
    assertIsType(type, 1);
    return union(type, optionalUndefinedType);
}
/**
 * `types.maybeNull` - Maybe will make a type nullable, and also optional.
 * The value `null` will be used to represent no value.
 *
 * @param type
 * @returns
 */
function maybeNull(type) {
    assertIsType(type, 1);
    return union(type, optionalNullType);
}

var Late = /** @class */ (function (_super) {
    __extends(Late, _super);
    function Late(name, _definition) {
        var _this = _super.call(this, name) || this;
        _this._definition = _definition;
        return _this;
    }
    Object.defineProperty(Late.prototype, "flags", {
        get: function () {
            return (this._subType ? this._subType.flags : 0) | TypeFlags.Late;
        },
        enumerable: true,
        configurable: true
    });
    Late.prototype.getSubType = function (mustSucceed) {
        if (!this._subType) {
            var t = undefined;
            try {
                t = this._definition();
            }
            catch (e) {
                if (e instanceof ReferenceError)
                    // can happen in strict ES5 code when a definition is self refering
                    t = undefined;
                else
                    throw e;
            }
            if (mustSucceed && t === undefined)
                throw fail$1("Late type seems to be used too early, the definition (still) returns undefined");
            if (t) {
                if (devMode() && !isType(t))
                    throw fail$1("Failed to determine subtype, make sure types.late returns a type definition.");
                this._subType = t;
            }
        }
        return this._subType;
    };
    Late.prototype.instantiate = function (parent, subpath, environment, initialValue) {
        return this.getSubType(true).instantiate(parent, subpath, environment, initialValue);
    };
    Late.prototype.reconcile = function (current, newValue, parent, subpath) {
        return this.getSubType(true).reconcile(current, newValue, parent, subpath);
    };
    Late.prototype.describe = function () {
        var t = this.getSubType(false);
        return t ? t.name : "<uknown late type>";
    };
    Late.prototype.isValidSnapshot = function (value, context) {
        var t = this.getSubType(false);
        if (!t) {
            // See #916; the variable the definition closure is pointing to wasn't defined yet, so can't be evaluted yet here
            return typeCheckSuccess();
        }
        return t.validate(value, context);
    };
    Late.prototype.isAssignableFrom = function (type) {
        var t = this.getSubType(false);
        return t ? t.isAssignableFrom(type) : false;
    };
    Late.prototype.getSubTypes = function () {
        var subtype = this.getSubType(false);
        return subtype ? subtype : cannotDetermineSubtype;
    };
    return Late;
}(BaseType));
/**
 * `types.late` - Defines a type that gets implemented later. This is useful when you have to deal with circular dependencies.
 * Please notice that when defining circular dependencies TypeScript isn't smart enough to inference them.
 *
 * Example:
 * ```ts
 *   // TypeScript isn't smart enough to infer self referencing types.
 *  const Node = types.model({
 *       children: types.array(types.late((): IAnyModelType => Node)) // then typecast each array element to Instance<typeof Node>
 *  })
 * ```
 *
 * @param name The name to use for the type that will be returned.
 * @param type A function that returns the type that will be defined.
 * @returns
 */
function late(nameOrType, maybeType) {
    var name = typeof nameOrType === "string" ? nameOrType : "late(" + nameOrType.toString() + ")";
    var type = typeof nameOrType === "string" ? maybeType : nameOrType;
    // checks that the type is actually a late type
    if (devMode()) {
        if (!(typeof type === "function" && type.length === 0))
            throw fail$1("Invalid late type, expected a function with zero arguments that returns a type, got: " +
                type);
    }
    return new Late(name, type);
}
/**
 * Returns if a given value represents a late type.
 *
 * @param type
 * @returns
 */
function isLateType(type) {
    return isType(type) && (type.flags & TypeFlags.Late) > 0;
}

/**
 * @internal
 * @hidden
 */
var Frozen = /** @class */ (function (_super) {
    __extends(Frozen, _super);
    function Frozen(subType) {
        var _this = _super.call(this, subType ? "frozen(" + subType.name + ")" : "frozen") || this;
        _this.subType = subType;
        _this.flags = TypeFlags.Frozen;
        return _this;
    }
    Frozen.prototype.describe = function () {
        return "<any immutable value>";
    };
    Frozen.prototype.instantiate = function (parent, subpath, environment, value) {
        // create the node
        return createScalarNode(this, parent, subpath, environment, deepFreeze(value));
    };
    Frozen.prototype.isValidSnapshot = function (value, context) {
        if (!isSerializable(value)) {
            return typeCheckFailure(context, value, "Value is not serializable and cannot be frozen");
        }
        if (this.subType)
            return this.subType.validate(value, context);
        return typeCheckSuccess();
    };
    return Frozen;
}(SimpleType));
var untypedFrozenInstance = new Frozen();
/**
 * `types.frozen` - Frozen can be used to store any value that is serializable in itself (that is valid JSON).
 * Frozen values need to be immutable or treated as if immutable. They need be serializable as well.
 * Values stored in frozen will snapshotted as-is by MST, and internal changes will not be tracked.
 *
 * This is useful to store complex, but immutable values like vectors etc. It can form a powerful bridge to parts of your application that should be immutable, or that assume data to be immutable.
 *
 * Note: if you want to store free-form state that is mutable, or not serializeable, consider using volatile state instead.
 *
 * Frozen properties can be defined in three different ways
 * 1. `types.frozen(SubType)` - provide a valid MST type and frozen will check if the provided data conforms the snapshot for that type
 * 2. `types.frozen({ someDefaultValue: true})` - provide a primitive value, object or array, and MST will infer the type from that object, and also make it the default value for the field
 * 3. `types.frozen<TypeScriptType>()` - provide a typescript type, to help in strongly typing the field (design time only)
 *
 * Example:
 * ```ts
 * const GameCharacter = types.model({
 *   name: string,
 *   location: types.frozen({ x: 0, y: 0})
 * })
 *
 * const hero = GameCharacter.create({
 *   name: "Mario",
 *   location: { x: 7, y: 4 }
 * })
 *
 * hero.location = { x: 10, y: 2 } // OK
 * hero.location.x = 7 // Not ok!
 * ```
 *
 * ```ts
 * type Point = { x: number, y: number }
 *    const Mouse = types.model({
 *         loc: types.frozen<Point>()
 *    })
 * ```
 *
 * @param defaultValueOrType
 * @returns
 */
function frozen(arg) {
    if (arguments.length === 0)
        return untypedFrozenInstance;
    else if (isType(arg))
        return new Frozen(arg);
    else
        return optional(untypedFrozenInstance, arg);
}
/**
 * Returns if a given value represents a frozen type.
 *
 * @param type
 * @returns
 */
function isFrozenType(type) {
    return isType(type) && (type.flags & TypeFlags.Frozen) > 0;
}

function getInvalidationCause(hook) {
    switch (hook) {
        case Hook.beforeDestroy:
            return "destroy";
        case Hook.beforeDetach:
            return "detach";
        default:
            return undefined;
    }
}
var StoredReference = /** @class */ (function () {
    function StoredReference(value, targetType) {
        this.targetType = targetType;
        if (isValidIdentifier(value)) {
            this.identifier = value;
        }
        else if (isStateTreeNode(value)) {
            var targetNode = getStateTreeNode(value);
            if (!targetNode.identifierAttribute)
                throw fail$1("Can only store references with a defined identifier attribute.");
            var id = targetNode.unnormalizedIdentifier;
            if (id === null || id === undefined) {
                throw fail$1("Can only store references to tree nodes with a defined identifier.");
            }
            this.identifier = id;
        }
        else {
            throw fail$1("Can only store references to tree nodes or identifiers, got: '" + value + "'");
        }
    }
    StoredReference.prototype.updateResolvedReference = function (node) {
        var normalizedId = normalizeIdentifier(this.identifier);
        var root = node.root;
        var lastCacheModification = root.identifierCache.getLastCacheModificationPerId(normalizedId);
        if (!this.resolvedReference ||
            this.resolvedReference.lastCacheModification !== lastCacheModification) {
            var targetType = this.targetType;
            // reference was initialized with the identifier of the target
            var target = root.identifierCache.resolve(targetType, normalizedId);
            if (!target) {
                throw new InvalidReferenceError("[mobx-state-tree] Failed to resolve reference '" + this.identifier + "' to type '" + this.targetType.name + "' (from node: " + node.path + ")");
            }
            this.resolvedReference = {
                node: target,
                lastCacheModification: lastCacheModification
            };
        }
    };
    Object.defineProperty(StoredReference.prototype, "resolvedValue", {
        get: function () {
            this.updateResolvedReference(this.node);
            return this.resolvedReference.node.value;
        },
        enumerable: true,
        configurable: true
    });
    return StoredReference;
}());
/**
 * @internal
 * @hidden
 */
var InvalidReferenceError = /** @class */ (function (_super) {
    __extends(InvalidReferenceError, _super);
    function InvalidReferenceError(m) {
        var _this = _super.call(this, m) || this;
        Object.setPrototypeOf(_this, InvalidReferenceError.prototype);
        return _this;
    }
    return InvalidReferenceError;
}(Error));
/**
 * @internal
 * @hidden
 */
var BaseReferenceType = /** @class */ (function (_super) {
    __extends(BaseReferenceType, _super);
    function BaseReferenceType(targetType, onInvalidated) {
        var _this = _super.call(this, "reference(" + targetType.name + ")") || this;
        _this.targetType = targetType;
        _this.onInvalidated = onInvalidated;
        _this.flags = TypeFlags.Reference;
        return _this;
    }
    BaseReferenceType.prototype.describe = function () {
        return this.name;
    };
    BaseReferenceType.prototype.isAssignableFrom = function (type) {
        return this.targetType.isAssignableFrom(type);
    };
    BaseReferenceType.prototype.isValidSnapshot = function (value, context) {
        return isValidIdentifier(value)
            ? typeCheckSuccess()
            : typeCheckFailure(context, value, "Value is not a valid identifier, which is a string or a number");
    };
    BaseReferenceType.prototype.fireInvalidated = function (cause, storedRefNode, referenceId, refTargetNode) {
        // to actually invalidate a reference we need an alive parent,
        // since it is a scalar value (immutable-ish) and we need to change it
        // from the parent
        var storedRefParentNode = storedRefNode.parent;
        if (!storedRefParentNode || !storedRefParentNode.isAlive) {
            return;
        }
        var storedRefParentValue = storedRefParentNode.storedValue;
        if (!storedRefParentValue) {
            return;
        }
        this.onInvalidated({
            cause: cause,
            parent: storedRefParentValue,
            invalidTarget: refTargetNode ? refTargetNode.storedValue : undefined,
            invalidId: referenceId,
            replaceRef: function (newRef) {
                applyPatch(storedRefNode.root.storedValue, {
                    op: "replace",
                    value: newRef,
                    path: storedRefNode.path
                });
            },
            removeRef: function () {
                if (isModelType(storedRefParentNode.type)) {
                    this.replaceRef(undefined);
                }
                else {
                    applyPatch(storedRefNode.root.storedValue, {
                        op: "remove",
                        path: storedRefNode.path
                    });
                }
            }
        });
    };
    BaseReferenceType.prototype.addTargetNodeWatcher = function (storedRefNode, referenceId) {
        var _this = this;
        // this will make sure the target node becomes created
        var refTargetValue = this.getValue(storedRefNode);
        if (!refTargetValue) {
            return undefined;
        }
        var refTargetNode = getStateTreeNode(refTargetValue);
        var hookHandler = function (_, refTargetNodeHook) {
            var cause = getInvalidationCause(refTargetNodeHook);
            if (!cause) {
                return;
            }
            _this.fireInvalidated(cause, storedRefNode, referenceId, refTargetNode);
        };
        var refTargetDetachHookDisposer = refTargetNode.registerHook(Hook.beforeDetach, hookHandler);
        var refTargetDestroyHookDisposer = refTargetNode.registerHook(Hook.beforeDestroy, hookHandler);
        return function () {
            refTargetDetachHookDisposer();
            refTargetDestroyHookDisposer();
        };
    };
    BaseReferenceType.prototype.watchTargetNodeForInvalidations = function (storedRefNode, identifier, customGetSet) {
        var _this = this;
        if (!this.onInvalidated) {
            return;
        }
        var onRefTargetDestroyedHookDisposer;
        // get rid of the watcher hook when the stored ref node is destroyed
        // detached is ignored since scalar nodes (where the reference resides) cannot be detached
        storedRefNode.registerHook(Hook.beforeDestroy, function () {
            if (onRefTargetDestroyedHookDisposer) {
                onRefTargetDestroyedHookDisposer();
            }
        });
        var startWatching = function (sync) {
            // re-create hook in case the stored ref gets reattached
            if (onRefTargetDestroyedHookDisposer) {
                onRefTargetDestroyedHookDisposer();
            }
            // make sure the target node is actually there and initialized
            var storedRefParentNode = storedRefNode.parent;
            var storedRefParentValue = storedRefParentNode && storedRefParentNode.storedValue;
            if (storedRefParentNode && storedRefParentNode.isAlive && storedRefParentValue) {
                var refTargetNodeExists = void 0;
                if (customGetSet) {
                    refTargetNodeExists = !!customGetSet.get(identifier, storedRefParentValue);
                }
                else {
                    refTargetNodeExists = storedRefNode.root.identifierCache.has(_this.targetType, normalizeIdentifier(identifier));
                }
                if (!refTargetNodeExists) {
                    // we cannot change the reference in sync mode
                    // since we are in the middle of a reconciliation/instantiation and the change would be overwritten
                    // for those cases just let the wrong reference be assigned and fail upon usage
                    // (like current references do)
                    // this means that effectively this code will only run when it is created from a snapshot
                    if (!sync) {
                        _this.fireInvalidated("invalidSnapshotReference", storedRefNode, identifier, null);
                    }
                }
                else {
                    onRefTargetDestroyedHookDisposer = _this.addTargetNodeWatcher(storedRefNode, identifier);
                }
            }
        };
        if (storedRefNode.state === NodeLifeCycle.FINALIZED) {
            // already attached, so the whole tree is ready
            startWatching(true);
        }
        else {
            if (!storedRefNode.isRoot) {
                // start watching once the whole tree is ready
                storedRefNode.root.registerHook(Hook.afterCreationFinalization, function () {
                    // make sure to attach it so it can start listening
                    if (storedRefNode.parent) {
                        storedRefNode.parent.createObservableInstanceIfNeeded();
                    }
                });
            }
            // start watching once the node is attached somewhere / parent changes
            storedRefNode.registerHook(Hook.afterAttach, function () {
                startWatching(false);
            });
        }
    };
    return BaseReferenceType;
}(SimpleType));
/**
 * @internal
 * @hidden
 */
var IdentifierReferenceType = /** @class */ (function (_super) {
    __extends(IdentifierReferenceType, _super);
    function IdentifierReferenceType(targetType, onInvalidated) {
        return _super.call(this, targetType, onInvalidated) || this;
    }
    IdentifierReferenceType.prototype.getValue = function (storedRefNode) {
        if (!storedRefNode.isAlive)
            return undefined;
        var storedRef = storedRefNode.storedValue;
        return storedRef.resolvedValue;
    };
    IdentifierReferenceType.prototype.getSnapshot = function (storedRefNode) {
        var ref = storedRefNode.storedValue;
        return ref.identifier;
    };
    IdentifierReferenceType.prototype.instantiate = function (parent, subpath, environment, initialValue) {
        var identifier = isStateTreeNode(initialValue)
            ? getIdentifier(initialValue)
            : initialValue;
        var storedRef = new StoredReference(initialValue, this.targetType);
        var storedRefNode = createScalarNode(this, parent, subpath, environment, storedRef);
        storedRef.node = storedRefNode;
        this.watchTargetNodeForInvalidations(storedRefNode, identifier, undefined);
        return storedRefNode;
    };
    IdentifierReferenceType.prototype.reconcile = function (current, newValue, parent, subpath) {
        if (!current.isDetaching && current.type === this) {
            var compareByValue = isStateTreeNode(newValue);
            var ref = current.storedValue;
            if ((!compareByValue && ref.identifier === newValue) ||
                (compareByValue && ref.resolvedValue === newValue)) {
                current.setParent(parent, subpath);
                return current;
            }
        }
        var newNode = this.instantiate(parent, subpath, undefined, newValue);
        current.die(); // noop if detaching
        return newNode;
    };
    return IdentifierReferenceType;
}(BaseReferenceType));
/**
 * @internal
 * @hidden
 */
var CustomReferenceType = /** @class */ (function (_super) {
    __extends(CustomReferenceType, _super);
    function CustomReferenceType(targetType, options, onInvalidated) {
        var _this = _super.call(this, targetType, onInvalidated) || this;
        _this.options = options;
        return _this;
    }
    CustomReferenceType.prototype.getValue = function (storedRefNode) {
        if (!storedRefNode.isAlive)
            return undefined;
        var referencedNode = this.options.get(storedRefNode.storedValue, storedRefNode.parent ? storedRefNode.parent.storedValue : null);
        return referencedNode;
    };
    CustomReferenceType.prototype.getSnapshot = function (storedRefNode) {
        return storedRefNode.storedValue;
    };
    CustomReferenceType.prototype.instantiate = function (parent, subpath, environment, newValue) {
        var identifier = isStateTreeNode(newValue)
            ? this.options.set(newValue, parent ? parent.storedValue : null)
            : newValue;
        var storedRefNode = createScalarNode(this, parent, subpath, environment, identifier);
        this.watchTargetNodeForInvalidations(storedRefNode, identifier, this.options);
        return storedRefNode;
    };
    CustomReferenceType.prototype.reconcile = function (current, newValue, parent, subpath) {
        var newIdentifier = isStateTreeNode(newValue)
            ? this.options.set(newValue, current ? current.storedValue : null)
            : newValue;
        if (!current.isDetaching &&
            current.type === this &&
            current.storedValue === newIdentifier) {
            current.setParent(parent, subpath);
            return current;
        }
        var newNode = this.instantiate(parent, subpath, undefined, newIdentifier);
        current.die(); // noop if detaching
        return newNode;
    };
    return CustomReferenceType;
}(BaseReferenceType));
/**
 * `types.reference` - Creates a reference to another type, which should have defined an identifier.
 * See also the [reference and identifiers](https://github.com/mobxjs/mobx-state-tree#references-and-identifiers) section.
 */
function reference(subType, options) {
    assertIsType(subType, 1);
    if (devMode()) {
        if (arguments.length === 2 && typeof arguments[1] === "string") {
            // istanbul ignore next
            throw fail$1("References with base path are no longer supported. Please remove the base path.");
        }
    }
    var getSetOptions = options ? options : undefined;
    var onInvalidated = options
        ? options.onInvalidated
        : undefined;
    if (getSetOptions && (getSetOptions.get || getSetOptions.set)) {
        if (devMode()) {
            if (!getSetOptions.get || !getSetOptions.set) {
                throw fail$1("reference options must either contain both a 'get' and a 'set' method or none of them");
            }
        }
        return new CustomReferenceType(subType, {
            get: getSetOptions.get,
            set: getSetOptions.set
        }, onInvalidated);
    }
    else {
        return new IdentifierReferenceType(subType, onInvalidated);
    }
}
/**
 * Returns if a given value represents a reference type.
 *
 * @param type
 * @returns
 */
function isReferenceType(type) {
    return (type.flags & TypeFlags.Reference) > 0;
}
/**
 * `types.safeReference` - A safe reference is like a standard reference, except that it accepts the undefined value by default
 * and automatically sets itself to undefined (when the parent is a model) / removes itself from arrays and maps
 * when the reference it is pointing to gets detached/destroyed.
 *
 * The optional options parameter object accepts a parameter named `acceptsUndefined`, which is set to true by default, so it is suitable
 * for model properties.
 * When used inside collections (arrays/maps), it is recommended to set this option to false so it can't take undefined as value,
 * which is usually the desired in those cases.
 *
 * Strictly speaking it is a `types.maybe(types.reference(X))` (when `acceptsUndefined` is set to true, the default) and
 * `types.reference(X)` (when `acceptsUndefined` is set to false), both of them with a customized `onInvalidated` option.
 *
 * @param subType
 * @param options
 * @returns
 */
function safeReference(subType, options) {
    var refType = reference(subType, __assign(__assign({}, options), { onInvalidated: function (ev) {
            ev.removeRef();
        } }));
    if (options && options.acceptsUndefined === false) {
        return refType;
    }
    else {
        return maybe(refType);
    }
}

var BaseIdentifierType = /** @class */ (function (_super) {
    __extends(BaseIdentifierType, _super);
    function BaseIdentifierType(name, validType) {
        var _this = _super.call(this, name) || this;
        _this.validType = validType;
        _this.flags = TypeFlags.Identifier;
        return _this;
    }
    BaseIdentifierType.prototype.instantiate = function (parent, subpath, environment, initialValue) {
        if (!parent || !(parent.type instanceof ModelType))
            throw fail$1("Identifier types can only be instantiated as direct child of a model type");
        return createScalarNode(this, parent, subpath, environment, initialValue);
    };
    BaseIdentifierType.prototype.reconcile = function (current, newValue, parent, subpath) {
        // we don't consider detaching here since identifier are scalar nodes, and scalar nodes cannot be detached
        if (current.storedValue !== newValue)
            throw fail$1("Tried to change identifier from '" + current.storedValue + "' to '" + newValue + "'. Changing identifiers is not allowed.");
        current.setParent(parent, subpath);
        return current;
    };
    BaseIdentifierType.prototype.isValidSnapshot = function (value, context) {
        if (typeof value !== this.validType) {
            return typeCheckFailure(context, value, "Value is not a valid " + this.describe() + ", expected a " + this.validType);
        }
        return typeCheckSuccess();
    };
    return BaseIdentifierType;
}(SimpleType));
/**
 * @internal
 * @hidden
 */
var IdentifierType = /** @class */ (function (_super) {
    __extends(IdentifierType, _super);
    function IdentifierType() {
        var _this = _super.call(this, "identifier", "string") || this;
        _this.flags = TypeFlags.Identifier;
        return _this;
    }
    IdentifierType.prototype.describe = function () {
        return "identifier";
    };
    return IdentifierType;
}(BaseIdentifierType));
/**
 * @internal
 * @hidden
 */
var IdentifierNumberType = /** @class */ (function (_super) {
    __extends(IdentifierNumberType, _super);
    function IdentifierNumberType() {
        return _super.call(this, "identifierNumber", "number") || this;
    }
    IdentifierNumberType.prototype.getSnapshot = function (node) {
        return node.storedValue;
    };
    IdentifierNumberType.prototype.describe = function () {
        return "identifierNumber";
    };
    return IdentifierNumberType;
}(BaseIdentifierType));
/**
 * `types.identifier` - Identifiers are used to make references, lifecycle events and reconciling works.
 * Inside a state tree, for each type can exist only one instance for each given identifier.
 * For example there couldn't be 2 instances of user with id 1. If you need more, consider using references.
 * Identifier can be used only as type property of a model.
 * This type accepts as parameter the value type of the identifier field that can be either string or number.
 *
 * Example:
 * ```ts
 *  const Todo = types.model("Todo", {
 *      id: types.identifier,
 *      title: types.string
 *  })
 * ```
 *
 * @returns
 */
var identifier = new IdentifierType();
/**
 * `types.identifierNumber` - Similar to `types.identifier`. This one will serialize from / to a number when applying snapshots
 *
 * Example:
 * ```ts
 *  const Todo = types.model("Todo", {
 *      id: types.identifierNumber,
 *      title: types.string
 *  })
 * ```
 *
 * @returns
 */
var identifierNumber = new IdentifierNumberType();
/**
 * Returns if a given value represents an identifier type.
 *
 * @param type
 * @returns
 */
function isIdentifierType(type) {
    return isType(type) && (type.flags & TypeFlags.Identifier) > 0;
}
/**
 * @internal
 * @hidden
 */
function normalizeIdentifier(id) {
    return "" + id;
}
/**
 * @internal
 * @hidden
 */
function isValidIdentifier(id) {
    return typeof id === "string" || typeof id === "number";
}
/**
 * @internal
 * @hidden
 */
function assertIsValidIdentifier(id, argNumber) {
    assertArg(id, isValidIdentifier, "string or number (identifier)", argNumber);
}

/**
 * `types.custom` - Creates a custom type. Custom types can be used for arbitrary immutable values, that have a serializable representation. For example, to create your own Date representation, Decimal type etc.
 *
 * The signature of the options is:
 * ```ts
 * export interface CustomTypeOptions<S, T> {
 *     // Friendly name
 *     name: string
 *     // given a serialized value and environment, how to turn it into the target type
 *     fromSnapshot(snapshot: S, env: any): T
 *     // return the serialization of the current value
 *     toSnapshot(value: T): S
 *     // if true, this is a converted value, if false, it's a snapshot
 *     isTargetType(value: T | S): value is T
 *     // a non empty string is assumed to be a validation error
 *     getValidationMessage?(snapshot: S): string
 * }
 * ```
 *
 * Example:
 * ```ts
 * const DecimalPrimitive = types.custom<string, Decimal>({
 *     name: "Decimal",
 *     fromSnapshot(value: string) {
 *         return new Decimal(value)
 *     },
 *     toSnapshot(value: Decimal) {
 *         return value.toString()
 *     },
 *     isTargetType(value: string | Decimal): boolean {
 *         return value instanceof Decimal
 *     },
 *     getValidationMessage(value: string): string {
 *         if (/^-?\d+\.\d+$/.test(value)) return "" // OK
 *         return `'${value}' doesn't look like a valid decimal number`
 *     }
 * })
 *
 * const Wallet = types.model({
 *     balance: DecimalPrimitive
 * })
 * ```
 *
 * @param options
 * @returns
 */
function custom(options) {
    return new CustomType(options);
}
/**
 * @internal
 * @hidden
 */
var CustomType = /** @class */ (function (_super) {
    __extends(CustomType, _super);
    function CustomType(options) {
        var _this = _super.call(this, options.name) || this;
        _this.options = options;
        _this.flags = TypeFlags.Custom;
        return _this;
    }
    CustomType.prototype.describe = function () {
        return this.name;
    };
    CustomType.prototype.isValidSnapshot = function (value, context) {
        if (this.options.isTargetType(value))
            return typeCheckSuccess();
        var typeError = this.options.getValidationMessage(value);
        if (typeError) {
            return typeCheckFailure(context, value, "Invalid value for type '" + this.name + "': " + typeError);
        }
        return typeCheckSuccess();
    };
    CustomType.prototype.getSnapshot = function (node) {
        return this.options.toSnapshot(node.storedValue);
    };
    CustomType.prototype.instantiate = function (parent, subpath, environment, initialValue) {
        var valueToStore = this.options.isTargetType(initialValue)
            ? initialValue
            : this.options.fromSnapshot(initialValue, parent && parent.root.environment);
        return createScalarNode(this, parent, subpath, environment, valueToStore);
    };
    CustomType.prototype.reconcile = function (current, value, parent, subpath) {
        var isSnapshot = !this.options.isTargetType(value);
        // in theory customs use scalar nodes which cannot be detached, but still...
        if (!current.isDetaching) {
            var unchanged = current.type === this &&
                (isSnapshot ? value === current.snapshot : value === current.storedValue);
            if (unchanged) {
                current.setParent(parent, subpath);
                return current;
            }
        }
        var valueToStore = isSnapshot
            ? this.options.fromSnapshot(value, parent.root.environment)
            : value;
        var newNode = this.instantiate(parent, subpath, undefined, valueToStore);
        current.die(); // noop if detaching
        return newNode;
    };
    return CustomType;
}(SimpleType));

// we import the types to re-export them inside types.
var types = {
    enumeration: enumeration,
    model: model,
    compose: compose,
    custom: custom,
    reference: reference,
    safeReference: safeReference,
    union: union,
    optional: optional,
    literal: literal,
    maybe: maybe,
    maybeNull: maybeNull,
    refinement: refinement,
    string: string,
    boolean: boolean,
    number: number,
    integer: integer,
    Date: DatePrimitive,
    map: map,
    array: array,
    frozen: frozen,
    identifier: identifier,
    identifierNumber: identifierNumber,
    late: late,
    undefined: undefinedType,
    null: nullType,
    snapshotProcessor: snapshotProcessor
};

exports.addDisposer = addDisposer;
exports.addMiddleware = addMiddleware;
exports.applyAction = applyAction;
exports.applyPatch = applyPatch;
exports.applySnapshot = applySnapshot;
exports.cast = cast;
exports.castFlowReturn = castFlowReturn;
exports.castToReferenceSnapshot = castToReferenceSnapshot;
exports.castToSnapshot = castToSnapshot;
exports.clone = clone;
exports.createActionTrackingMiddleware = createActionTrackingMiddleware;
exports.createActionTrackingMiddleware2 = createActionTrackingMiddleware2;
exports.decorate = decorate;
exports.destroy = destroy;
exports.detach = detach;
exports.escapeJsonPath = escapeJsonPath;
exports.flow = flow;
exports.getChildType = getChildType;
exports.getEnv = getEnv;
exports.getIdentifier = getIdentifier;
exports.getLivelinessChecking = getLivelinessChecking;
exports.getMembers = getMembers;
exports.getNodeId = getNodeId;
exports.getParent = getParent;
exports.getParentOfType = getParentOfType;
exports.getPath = getPath;
exports.getPathParts = getPathParts;
exports.getPropertyMembers = getPropertyMembers;
exports.getRelativePath = getRelativePath;
exports.getRoot = getRoot;
exports.getRunningActionContext = getRunningActionContext;
exports.getSnapshot = getSnapshot;
exports.getType = getType;
exports.hasParent = hasParent;
exports.hasParentOfType = hasParentOfType;
exports.isActionContextChildOf = isActionContextChildOf;
exports.isActionContextThisOrChildOf = isActionContextThisOrChildOf;
exports.isAlive = isAlive;
exports.isArrayType = isArrayType;
exports.isFrozenType = isFrozenType;
exports.isIdentifierType = isIdentifierType;
exports.isLateType = isLateType;
exports.isLiteralType = isLiteralType;
exports.isMapType = isMapType;
exports.isModelType = isModelType;
exports.isOptionalType = isOptionalType;
exports.isPrimitiveType = isPrimitiveType;
exports.isProtected = isProtected;
exports.isReferenceType = isReferenceType;
exports.isRefinementType = isRefinementType;
exports.isRoot = isRoot;
exports.isStateTreeNode = isStateTreeNode;
exports.isType = isType;
exports.isUnionType = isUnionType;
exports.isValidReference = isValidReference;
exports.joinJsonPath = joinJsonPath;
exports.onAction = onAction;
exports.onPatch = onPatch;
exports.onSnapshot = onSnapshot;
exports.process = process$1;
exports.protect = protect;
exports.recordActions = recordActions;
exports.recordPatches = recordPatches;
exports.resolveIdentifier = resolveIdentifier;
exports.resolvePath = resolvePath;
exports.setLivelinessChecking = setLivelinessChecking;
exports.setLivelynessChecking = setLivelynessChecking;
exports.splitJsonPath = splitJsonPath;
exports.tryReference = tryReference;
exports.tryResolve = tryResolve;
exports.typecheck = typecheck;
exports.types = types;
exports.unescapeJsonPath = unescapeJsonPath;
exports.unprotect = unprotect;
exports.walk = walk;

})
		]
	]
}]);